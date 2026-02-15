'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ICONS } from '../constants';
import { useVoiceTutor } from '@/hooks/useVoiceTutor';
import { useAuthStore } from '@/lib/stores/auth.store';
import { TranscriptPanel } from '@/components/voice-tutor/TranscriptPanel';
import { AudioVisualizer } from '@/components/voice-tutor/AudioVisualizer';
import { SessionStats } from '@/components/voice-tutor/SessionStats';
import { SessionStatus } from '@/components/voice-tutor/SessionStatus';

const VOICE_OPTIONS = [
  { id: 'nova', label: 'Nova', desc: 'Warm & friendly' },
  { id: 'alloy', label: 'Alloy', desc: 'Neutral & balanced' },
  { id: 'echo', label: 'Echo', desc: 'Clear & steady' },
  { id: 'shimmer', label: 'Shimmer', desc: 'Soft & expressive' },
  { id: 'fable', label: 'Fable', desc: 'Story-like' },
  { id: 'onyx', label: 'Onyx', desc: 'Deep & authoritative' },
];

const VoiceTutor: React.FC = () => {
  useAuthStore();
  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [notebookId] = useState<string | undefined>();
  const [visualizerData, setVisualizerData] = useState<number[]>(Array(24).fill(10));
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const visualizerDataRef = useRef<number[]>(Array(24).fill(10));

  const {
    isRecording,
    isProcessing,
    isSpeaking,
    transcript,
    error,
    startRecording,
    stopRecording,
    stopSpeaking,
    replayLast,
    clearConversation,
  } = useVoiceTutor({ voice: selectedVoice, notebookId });

  // ── Mic audio visualizer (live waveform while recording) ────────────
  useEffect(() => {
    if (!isRecording) {
      visualizerDataRef.current = Array(24).fill(10);
      setVisualizerData(visualizerDataRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      analyserRef.current = null;
      return;
    }

    const setupAnalyser = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const bars = Array.from(dataArray)
            .slice(0, 24)
            .map((v) => Math.max(10, (v / 255) * 100));
          setVisualizerData(bars);
          animFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
      } catch {
        /* mic already captured by hook */
      }
    };
    setupAnalyser();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording]);

  // Fake visualizer pulse when tutor is speaking
  useEffect(() => {
    if (!isSpeaking) {
      visualizerDataRef.current = Array(24).fill(10);
      setVisualizerData(visualizerDataRef.current);
      return;
    }
    const interval = setInterval(() => {
      setVisualizerData(Array(24).fill(0).map(() => Math.max(10, Math.random() * 80)));
    }, 120);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  const studentTurns = transcript.filter((t) => t.speaker === 'student').length;
  const tutorTurns = transcript.filter((t) => t.speaker === 'tutor').length;
  const lastTutorTurn = [...transcript].reverse().find((t) => t.speaker === 'tutor');

  return (
    <div className="min-h-screen p-4 md:p-0">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 bg-linear-to-br from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 border-b-4 border-indigo-700">
            <ICONS.Mic className="w-7 h-7 text-white" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">
              Voice Tutor
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-semibold">
              Speak naturally in Hindi, English, or Hinglish — your AI tutor listens and explains
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left: Conversation Panel ──────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Visualizer */}
          <AudioVisualizer tutorSpeaking={isSpeaking || isRecording} visualizerData={visualizerData} />

          {/* Main Mic Button */}
          <div className="flex flex-col items-center gap-4">
            {/* Mic control */}
            <div className="relative">
              {/* Pulsing ring when recording */}
              {isRecording && (
                <div className="absolute inset-0 -m-4 rounded-full bg-rose-400/30 animate-ping" />
              )}
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isProcessing}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl border-b-6
                  ${isRecording
                    ? 'bg-rose-500 border-rose-700 scale-110 shadow-rose-300/50 dark:shadow-rose-900/50'
                    : isProcessing
                      ? 'bg-amber-500 border-amber-700 cursor-wait shadow-amber-300/50'
                      : 'bg-indigo-500 border-indigo-700 hover:scale-105 hover:shadow-indigo-300/50 dark:hover:shadow-indigo-900/50 active:scale-95'
                  }`}
              >
                {isProcessing ? (
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isRecording ? (
                  <ICONS.Mic className="w-10 h-10 text-white animate-pulse" strokeWidth={3} />
                ) : (
                  <ICONS.Mic className="w-10 h-10 text-white" strokeWidth={2.5} />
                )}
              </button>
            </div>

            {/* Status text */}
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 text-center">
              {isRecording
                ? '🎙️ Listening... Release to send'
                : isProcessing
                  ? '⏳ Processing your question...'
                  : isSpeaking
                    ? '🔊 Tutor is speaking...'
                    : 'Hold to speak'}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl font-bold text-sm hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors"
                >
                  <ICONS.MicOff className="w-4 h-4" />
                  Stop
                </button>
              )}
              {lastTutorTurn?.audioBase64 && !isSpeaking && (
                <button
                  onClick={replayLast}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold text-sm hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <ICONS.Play className="w-4 h-4" />
                  Replay
                </button>
              )}
              {transcript.length > 0 && (
                <button
                  onClick={clearConversation}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <ICONS.Trash className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-2xl text-sm font-semibold border-2 border-rose-200 dark:border-rose-800 max-w-md text-center">
                {error}
              </div>
            )}
          </div>

          {/* Transcript */}
          <TranscriptPanel transcript={transcript} connected={transcript.length > 0 || isProcessing} />
        </div>

        {/* ── Right: Sidebar ───────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Connection Status */}
          <SessionStatus
            connected={!error}
            status={
              isRecording
                ? 'Listening to your voice...'
                : isProcessing
                  ? 'AI is thinking...'
                  : isSpeaking
                    ? 'Tutor is explaining...'
                    : 'Ready — hold the mic button to ask a question'
            }
          />

          {/* Session Stats */}
          <SessionStats
            questionsAsked={studentTurns}
            questionsAnswered={tutorTurns}
            currentTopic={lastTutorTurn?.text?.slice(0, 50) || 'Start a conversation'}
            understandingScore={Math.min(1, tutorTurns * 0.15)}
            attentionScore={Math.min(1, (studentTurns + tutorTurns) * 0.1)}
          />

          {/* Voice Selector */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">
              Tutor Voice
            </h2>
            <div className="space-y-2">
              {VOICE_OPTIONS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all ${
                    selectedVoice === v.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700'
                      : 'border-2 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <p className={`font-bold text-sm ${selectedVoice === v.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {v.label}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{v.desc}</p>
                  </div>
                  {selectedVoice === v.id && (
                    <ICONS.Check className="w-5 h-5 text-indigo-500" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">
              How It Works
            </h2>
            <div className="space-y-3">
              {[
                { emoji: '🎙️', text: 'Hold the mic button and speak naturally' },
                { emoji: '🧠', text: 'AI understands Hindi, English, or Hinglish' },
                { emoji: '📚', text: 'Answers grounded in your study materials (RAG)' },
                { emoji: '🔊', text: 'Hear the explanation spoken aloud' },
                { emoji: '🔄', text: 'Ask follow-up questions for deeper understanding' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-lg">{step.emoji}</span>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Language Support Info */}
          <div className="bg-linear-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-3xl p-6 border-4 border-indigo-100 dark:border-indigo-800/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🇮🇳</span>
              <h3 className="font-black text-indigo-700 dark:text-indigo-300">Hinglish Support</h3>
            </div>
            <p className="text-sm text-indigo-600/80 dark:text-indigo-400/80 font-medium leading-relaxed">
              &quot;Bhai ye second law samajh nahi aa raha, simple me batao&quot; — just say it like you&apos;d ask a friend. Your tutor understands and replies naturally.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceTutor;
