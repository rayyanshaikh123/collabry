/**
 * Google Drive Integration for Study Board Images
 * Stores and retrieves images from user's Google Drive
 */

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Collabry Study Board Images';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webContentLink?: string;
  webViewLink?: string;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private tokenClient: any = null;
  private folderId: string | null = null;

  /**
   * Initialize Google Drive API
   */
  async initialize() {
    if (typeof window === 'undefined') return;

    // Load Google Identity Services
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.initializeTokenClient();
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.body.appendChild(script);
    });
  }

  /**
   * Initialize token client for OAuth
   */
  private initializeTokenClient() {
    if (!window.google?.accounts?.oauth2) return;

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error) {
          console.error('Token error:', response.error);
          return;
        }
        this.accessToken = response.access_token;
        localStorage.setItem('gdrive_token', response.access_token);
        localStorage.setItem('gdrive_token_expiry', String(Date.now() + (response.expires_in * 1000)));
      },
    });
  }

  /**
   * Request access token from user
   */
  async requestAccess(): Promise<boolean> {
    // Check for existing valid token
    const storedToken = localStorage.getItem('gdrive_token');
    const expiry = localStorage.getItem('gdrive_token_expiry');
    
    if (storedToken && expiry && Date.now() < parseInt(expiry)) {
      this.accessToken = storedToken;
      return true;
    }

    // Request new token
    return new Promise((resolve) => {
      if (!this.tokenClient) {
        console.error('Token client not initialized');
        resolve(false);
        return;
      }

      const originalCallback = this.tokenClient.callback;
      this.tokenClient.callback = (response: any) => {
        originalCallback(response);
        resolve(!response.error);
      };
      
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('gdrive_token');
    const expiry = localStorage.getItem('gdrive_token_expiry');
    return !!(token && expiry && Date.now() < parseInt(expiry));
  }

  /**
   * Sign out and clear tokens
   */
  signOut() {
    this.accessToken = null;
    localStorage.removeItem('gdrive_token');
    localStorage.removeItem('gdrive_token_expiry');
    localStorage.removeItem('gdrive_folder_id');
    this.folderId = null;
  }

  /**
   * Get or create the Collabry folder in Drive
   */
  private async getOrCreateFolder(): Promise<string> {
    if (this.folderId) return this.folderId;

    const storedFolderId = localStorage.getItem('gdrive_folder_id');
    if (storedFolderId) {
      this.folderId = storedFolderId;
      return storedFolderId;
    }

    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    // Search for existing folder
    const searchResponse = await fetch(
      `${DRIVE_API_BASE}/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    const searchData = await searchResponse.json();
    
    if (searchData.files && searchData.files.length > 0) {
      const folderId = String(searchData.files[0].id);
      this.folderId = folderId;
      localStorage.setItem('gdrive_folder_id', folderId);
      return folderId;
    }

    // Create new folder
    const createResponse = await fetch(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    const folder = await createResponse.json();
    this.folderId = folder.id;
    localStorage.setItem('gdrive_folder_id', folder.id);
    return folder.id;
  }

  /**
   * Upload base64 image to Drive
   */
  async uploadImage(base64Data: string, filename: string, mimeType: string = 'image/png'): Promise<DriveFile> {
    if (!this.accessToken) {
      const hasAccess = await this.requestAccess();
      if (!hasAccess) {
        throw new Error('Google Drive access denied');
      }
    }

    const folderId = await this.getOrCreateFolder();

    // Convert base64 to blob
    const byteString = base64Data.includes('base64,') 
      ? atob(base64Data.split(',')[1]) 
      : atob(base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });

    // Create metadata
    const metadata = {
      name: filename,
      mimeType: mimeType,
      parents: [folderId],
    };

    // Create multipart upload
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const response = await fetch(`${UPLOAD_API_BASE}/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const file = await response.json();
    
    // Make file publicly readable
    await this.makeFilePublic(file.id);
    
    return file;
  }

  /**
   * Make file publicly accessible
   */
  private async makeFilePublic(fileId: string) {
    await fetch(`${DRIVE_API_BASE}/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  }

  /**
   * Get public URL for a Drive file
   */
  getPublicUrl(fileId: string): string {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  /**
   * Download image from Drive
   */
  async downloadImage(fileId: string): Promise<string> {
    if (!this.accessToken) {
      const hasAccess = await this.requestAccess();
      if (!hasAccess) {
        throw new Error('Google Drive access denied');
      }
    }

    const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Delete file from Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
  }
}

// Singleton instance
export const googleDriveService = new GoogleDriveService();

// Type declarations for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: any) => any;
        };
      };
    };
  }
}
