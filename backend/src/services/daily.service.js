/**
 * Jitsi Meet Video Call Service
 * Manages Jitsi Meet rooms for voice/video chat
 * COMPLETELY FREE - No API key needed!
 */

class JitsiService {
  constructor() {
    // Use public Jitsi server (free) or your own domain
    this.domain = process.env.JITSI_DOMAIN || 'meet.jit.si';
  }

  /**
   * Create a Jitsi room for a board (instant, no API calls!)
   */
  async createRoom(boardId) {
    // Jitsi rooms are created instantly just by accessing a URL
    // No API calls needed - completely free!
    const roomName = this.sanitizeRoomName(boardId);
    
    return {
      url: `https://${this.domain}/${roomName}`,
      name: roomName,
      domain: this.domain,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Sanitize room name for Jitsi (alphanumeric only)
   */
  sanitizeRoomName(boardId) {
    return `collabry-${boardId.replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Get or create a room for a board (instant!)
   */
  async getOrCreateRoom(boardId) {
    // Jitsi rooms are created on-the-fly, no pre-creation needed
    return await this.createRoom(boardId);
  }

  /**
   * Get user display name for Jitsi
   */
  getUserDisplayName(userName, userId) {
    // Clean user display name
    return userName.split('@')[0] || `User-${userId.substring(0, 6)}`;
  }

}

module.exports = new JitsiService();
