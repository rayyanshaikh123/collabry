/**
 * useVoiceTutor — mic recording, voice chat, and audio playback hook.
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import { voiceChat, type VoiceChatResponse, type ConversationTurn } from '@/lib/services/voiceTutor.service';

interface UseVoiceTutorOpts {
  sessionId?: string;
  notebookId?: string;
  voice?: string;
}

export function useVoiceTutor(opts?: UseVoiceTutorOpts) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Start recording ──────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer webm (Chrome/Edge/Firefox) → fallback to mp4 (Safari)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 100) {
          setError('Recording too short. Hold the button and speak.');
          return;
        }

        await processAudio(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: unknown) {
      console.error('Mic access error:', err);
      setError('Microphone access denied. Please allow mic permission.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.sessionId, opts?.notebookId, opts?.voice]);

  // ── Stop recording ───────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // ── Process audio: send → get response → play ───────────────────────
  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result: VoiceChatResponse = await voiceChat(blob, {
        sessionId: opts?.sessionId,
        notebookId: opts?.notebookId,
        voice: opts?.voice,
      });

      // Add student turn
      if (result.transcript) {
        setTranscript((prev) => [
          ...prev,
          { speaker: 'student', text: result.transcript, timestamp: new Date().toISOString() },
        ]);
      }

      // Add tutor turn
      if (result.response_text) {
        setTranscript((prev) => [
          ...prev,
          {
            speaker: 'tutor',
            text: result.response_text,
            timestamp: new Date().toISOString(),
            audioBase64: result.audio_base64,
          },
        ]);
      }

      // Play TTS audio
      if (result.audio_base64) {
        await playAudio(result.audio_base64);
      }
    } catch (err: unknown) {
      console.error('Voice chat error:', err);
      setError(err instanceof Error ? err.message : 'Voice chat failed. Try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Play base64 audio ────────────────────────────────────────────────
  const playAudio = useCallback(async (base64: string) => {
    return new Promise<void>((resolve) => {
      try {
        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        const audioSrc = `data:audio/mpeg;base64,${base64}`;
        const audio = new Audio(audioSrc);
        audioRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          resolve();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        audio.play().catch(() => {
          setIsSpeaking(false);
          resolve();
        });
      } catch {
        setIsSpeaking(false);
        resolve();
      }
    });
  }, []);

  // ── Stop speaking ────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
    }
  }, []);

  // ── Replay last tutor message ────────────────────────────────────────
  const replayLast = useCallback(async () => {
    const lastTutor = [...transcript].reverse().find((t) => t.speaker === 'tutor' && t.audioBase64);
    if (lastTutor?.audioBase64) {
      await playAudio(lastTutor.audioBase64);
    }
  }, [transcript, playAudio]);

  // ── Clear conversation ───────────────────────────────────────────────
  const clearConversation = useCallback(() => {
    setTranscript([]);
    setError(null);
    stopSpeaking();
  }, [stopSpeaking]);

  return {
    // State
    isRecording,
    isProcessing,
    isSpeaking,
    transcript,
    error,

    // Actions
    startRecording,
    stopRecording,
    stopSpeaking,
    replayLast,
    clearConversation,
  };
}
