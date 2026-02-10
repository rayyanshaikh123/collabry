import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ConversationTurn {
  speaker: 'student' | 'tutor';
  text: string;
  timestamp: string;
}

interface UseVoiceSessionResult {
  // State
  loading: boolean;
  connected: boolean;
  sessionCreated: boolean;
  source: string;
  selectedFile: File | null;
  roomName: string | undefined;
  sessionId: string | undefined;
  token: string | undefined;
  wsUrl: string | undefined;
  transcript: ConversationTurn[];
  status: string;
  error: string | null;

  // Handlers
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileRemove: () => void;
  createLearningSession: () => Promise<void>;
  startVoiceSession: () => void;
  onTranscriptUpdate: (turn: ConversationTurn) => void;
  resetSessionState: () => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  setStatus: (status: string) => void;
}

export function useVoiceSession(
  accessToken: string | null,
  isAuthenticated: boolean
): UseVoiceSessionResult {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sessionCreated, setSessionCreated] = useState(false);
  const [source, setSource] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [roomName, setRoomName] = useState<string>();
  const [sessionId, setSessionId] = useState<string>();
  const [token, setToken] = useState<string>();
  const [wsUrl, setWsUrl] = useState<string>();
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [status, setStatus] = useState('Ready to start');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSource(content);
    };
    reader.readAsText(file);
  }, []);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setSource('');
  }, []);

  const createLearningSession = useCallback(async () => {
    if (!selectedFile || !source) {
      setError('Please upload study material before creating a session');
      return;
    }

    try {
      setLoading(true);
      setStatus('Creating learning session...');
      setError(null);

      if (!accessToken || !isAuthenticated) {
        setStatus('Please log in to create a session');
        setError('No authentication token found. Please log in.');
        setLoading(false);
        router.push('/login?redirect=/voice-tutor');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';
      const endpoint = `${apiUrl}/voice/rooms`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          notebook_id: 'general',
          username: 'Student',
          source: source,
        }),
      });

      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const text = await response.text();
          errorData = { detail: text || `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const errorMessage = errorData.detail || errorData.message || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setToken(data.student_token);
      setWsUrl(data.ws_url);
      setRoomName(data.room_name);
      setSessionId(data.session_id);
      setSessionCreated(true);
      setStatus('Learning session ready. Click "Start Voice Session" to begin.');
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error('Learning Session Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
      setStatus('Error: ' + errorMessage);
      setError(errorMessage);
      setLoading(false);
    }
  }, [selectedFile, source, accessToken, isAuthenticated, router]);

  const startVoiceSession = useCallback(() => {
    if (!sessionCreated || !roomName || !token || !wsUrl) {
      setError('Please create a learning session first');
      return;
    }

    setStatus('Connecting to voice tutor...');
    setConnected(true);
  }, [sessionCreated, roomName, token, wsUrl]);

  const onTranscriptUpdate = useCallback((turn: ConversationTurn) => {
    setTranscript(prev => [...prev, turn]);
  }, []);

  const resetSessionState = useCallback(() => {
    setConnected(false);
    setSessionCreated(false);
    setRoomName(undefined);
    setSessionId(undefined);
    setToken(undefined);
    setWsUrl(undefined);
    setSelectedFile(null);
    setSource('');
    setTranscript([]);
    setError(null);
    setStatus('Session ended');
  }, []);

  return {
    loading,
    connected,
    sessionCreated,
    source,
    selectedFile,
    roomName,
    sessionId,
    token,
    wsUrl,
    transcript,
    status,
    error,
    handleFileChange,
    handleFileRemove,
    createLearningSession,
    startVoiceSession,
    onTranscriptUpdate,
    resetSessionState,
    setConnected,
    setError,
    setStatus,
  };
}
