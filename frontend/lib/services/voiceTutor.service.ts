/**
 * Voice Tutor Service
 * Handles communication with the voice tutor API endpoints.
 */
import { apiClient } from '@/lib/api';

export interface VoiceChatResponse {
  transcript: string;
  response_text: string;
  audio_base64: string;
  session_id: string | null;
  processing_time: number;
}

export interface ConversationTurn {
  speaker: 'student' | 'tutor';
  text: string;
  timestamp: string;
  audioBase64?: string;
}

/**
 * Send audio to voice chat endpoint. Returns transcript + AI response + TTS audio.
 */
export async function voiceChat(
  audioBlob: Blob,
  opts?: { sessionId?: string; notebookId?: string; voice?: string }
): Promise<VoiceChatResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  if (opts?.sessionId) formData.append('session_id', opts.sessionId);
  if (opts?.notebookId) formData.append('notebook_id', opts.notebookId);
  if (opts?.voice) formData.append('voice', opts.voice);

  const response = await apiClient.post<{ data: VoiceChatResponse }>('/ai/voice/chat', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // voice turns can take a while
  });

  // The backend wraps in { success, data }
  const res = response as unknown as { data?: VoiceChatResponse };
  return res?.data ?? (response as unknown as VoiceChatResponse);
}

/**
 * Text-to-speech only (returns audio blob URL).
 */
export async function textToSpeech(text: string, voice: string = 'nova'): Promise<string> {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('voice', voice);

  const response = await apiClient.post('/ai/voice/tts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
    timeout: 30000,
  } as Record<string, unknown>);

  // Create blob URL for playback
  const blob = response instanceof Blob ? response : new Blob([response as BlobPart], { type: 'audio/mpeg' });
  return URL.createObjectURL(blob);
}
