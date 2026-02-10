'use client'

import { useEffect, useState, useCallback } from 'react'
import { ICONS } from '@/constants'
import { Button } from '@/components/UIElements'
import { useAuthStore } from '@/lib/stores/auth.store'
import { LiveKitRoom, useParticipants, useTracks, RoomAudioRenderer } from '@livekit/components-react'
import { Track } from 'livekit-client'

import { FileUploadSection } from '@/components/voice-tutor/FileUploadSection'
import { SessionStats as SessionStatsCard } from '@/components/voice-tutor/SessionStats'
import { SessionStatus } from '@/components/voice-tutor/SessionStatus'
import { AudioVisualizer } from '@/components/voice-tutor/AudioVisualizer'
import { TranscriptPanel } from '@/components/voice-tutor/TranscriptPanel'
import { useVoiceSession } from '@/hooks/useVoiceSession'

interface ConversationTurn {
  speaker: 'student' | 'tutor'
  text: string
  timestamp: string
}

interface SessionStats {
  duration: number
  questionsAsked: number
  questionsAnswered: number
  currentTopic: string
  understandingScore: number
  attentionScore: number
}

// Component to handle LiveKit audio and events inside the room
function LiveKitRoomContent({ 
  onTranscriptUpdate, 
  onTutorSpeaking, 
  onConnectionStatus 
}: { 
  onTranscriptUpdate: (turn: ConversationTurn) => void
  onTutorSpeaking: (speaking: boolean) => void
  onConnectionStatus: (status: string) => void
}) {
  const participants = useParticipants()
  const allTracks = useTracks()

  useEffect(() => {
    console.log('All participants:', participants.map(p => ({ identity: p.identity, isLocal: p.isLocal })))
    console.log('All tracks:', allTracks.map(t => ({ 
      source: t.source, 
      participant: t.participant.identity,
      kind: t.publication.kind 
    })))
    
    const agentParticipant = participants.find(p => !p.isLocal)
    if (agentParticipant) {
      console.log('Found agent participant:', agentParticipant.identity)
      onConnectionStatus('Connected to AI tutor - listening for audio')
      
      // Check for audio tracks
      const audioTracks = Array.from(agentParticipant.audioTrackPublications.values() as Iterable<any>)
      console.log('Agent audio tracks:', audioTracks.length)
      
      if (audioTracks.length > 0) {
        console.log('Agent has audio track!')
        onTutorSpeaking(true)
      }
    } else {
      console.log('No agent participant found yet')
    }
    
    // Check local participant for microphone
    const localParticipant = participants.find(p => p.isLocal)
    if (localParticipant) {
      console.log('Local participant tracks:', Array.from(localParticipant.audioTrackPublications.keys()))
    }
  }, [participants, allTracks, onConnectionStatus, onTutorSpeaking])

  useEffect(() => {
    // Monitor audio tracks for speaking visualization
    const agentTracks = allTracks.filter(t => !t.participant.isLocal && t.source === Track.Source.Microphone)
    console.log('Agent audio tracks:', agentTracks.length)
    
    if (agentTracks.length > 0) {
      agentTracks.forEach(track => {
        console.log('Track muted:', track.publication.isMuted)
        onTutorSpeaking(!track.publication.isMuted)
      })
    }
  }, [allTracks, onTutorSpeaking])

  return (
    <>
      <RoomAudioRenderer />
    </>
  )
}

export default function VoiceTutorPage() {
  const { accessToken, isAuthenticated } = useAuthStore()
  const [muted, setMuted] = useState(false)
  const [tutorSpeaking, setTutorSpeaking] = useState(false)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    duration: 0,
    questionsAsked: 0,
    questionsAnswered: 0,
    currentTopic: 'Not started',
    understandingScore: 0,
    attentionScore: 1.0,
  })

  const {
    loading,
    connected,
    sessionCreated,
    selectedFile,
    sessionId,
    token,
    wsUrl,
    transcript,
    status,
    error,
    setError,
    handleFileChange,
    handleFileRemove,
    createLearningSession,
    startVoiceSession,
    onTranscriptUpdate,
    resetSessionState,
    setConnected,
    setStatus,
  } = useVoiceSession(accessToken, isAuthenticated)

  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(20).fill(0))

  // Simulated audio visualizer effect
  useEffect(() => {
    if (!tutorSpeaking) {
      setVisualizerData(new Array(20).fill(0))
      return
    }

    const interval = setInterval(() => {
      setVisualizerData(prev => 
        prev.map(() => Math.random() * 100)
      )
    }, 100)

    return () => clearInterval(interval)
  }, [tutorSpeaking])

  const endSession = async () => {
    if (!sessionId) return

    try {
      setStatus('Ending session...')
      
      if (!accessToken) {
        console.warn('No access token for ending session')
        setConnected(false)
        setRoomName(undefined)
        setSessionId(undefined)
        setStatus('Session ended')
        return
      }

      await fetch(
        `${process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000'}/voice/sessions/${sessionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      resetSessionState()
      setSessionStats({
        duration: 0,
        questionsAsked: 0,
        questionsAnswered: 0,
        currentTopic: 'Not started',
        understandingScore: 0,
        attentionScore: 1.0,
      })
    } catch (error) {
      console.error('Failed to end session:', error)
      setStatus('Error ending session')
    }
  }

  const toggleMute = () => {
    setMuted(!muted)
    setStatus(muted ? 'Microphone enabled' : 'Microphone muted')
  }

  const handleTutorSpeaking = useCallback((speaking: boolean) => {
    setTutorSpeaking(speaking)
  }, [])

  const handleConnectionStatus = useCallback((newStatus: string) => {
    setStatus(newStatus)
  }, [])

  return (
    <div className="h-full flex flex-col relative bg-slate-50 dark:bg-slate-950 overflow-hidden -m-4 md:-m-8">
      {/* LiveKit Room for audio connection - rendered but not visible */}
      {connected && token && wsUrl && (
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          audio={true}
          video={false}
          options={{
            publishDefaults: {
              dtx: true,
              red: false,
              simulcast: false,
            },
            audioCaptureDefaults: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
            },
          }}
          onConnected={() => {
            console.log('✓ LiveKit connected')
            setStatus('Connected to AI tutor - microphone active')
          }}
          onDisconnected={() => {
            console.log('LiveKit disconnected')
            setStatus('Disconnected')
            setConnected(false)
          }}
          onError={(error) => {
            console.error('LiveKit error:', error)
            setError(`Connection error: ${error.message}`)
          }}
          onMediaDeviceFailure={(error) => {
            console.error('Media device error:', error)
            setError(`Microphone error: ${String(error) || 'Could not access microphone'}`)
          }}
          style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
        >
          <LiveKitRoomContent 
            onTranscriptUpdate={onTranscriptUpdate}
            onTutorSpeaking={handleTutorSpeaking}
            onConnectionStatus={handleConnectionStatus}
          />
        </LiveKitRoom>
      )}
      
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b-4 border-slate-100 dark:border-slate-800 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-3">
              <span className="text-4xl">🎙️</span>
              Voice Tutor
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Learn through natural conversation with your AI teacher
            </p>
          </div>
          {!connected && !sessionCreated ? (
            <Button 
              onClick={createLearningSession} 
              disabled={loading || !selectedFile}
              variant="primary" 
              className="gap-2 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ICONS.Book className="w-5 h-5" />
              {loading ? 'Creating...' : 'Create Learning Session'}
            </Button>
          ) : !connected && sessionCreated ? (
            <Button 
              onClick={startVoiceSession} 
              disabled={loading}
              variant="primary" 
              className="gap-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              <ICONS.Mic className="w-5 h-5" />
              Start Voice Session
            </Button>
          ) : (
            <Button 
              onClick={endSession}
              className="gap-2 bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white"
            >
              <ICONS.Phone className="w-5 h-5" />
              End Session
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Error Banner */}
        {error && (
          <div className="max-w-7xl mx-auto mb-6">
            <div className="bg-rose-50 dark:bg-rose-900/20 border-4 border-rose-200 dark:border-rose-800 rounded-3xl p-6 flex items-start gap-4">
              <ICONS.AlertCircle className="w-6 h-6 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-rose-800 dark:text-rose-300 text-lg mb-2">Connection Error</h3>
                <p className="text-rose-700 dark:text-rose-400">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Source Input */}
        {!connected && !sessionCreated && (
          <FileUploadSection
            selectedFile={selectedFile}
            loading={loading}
            onFileChange={handleFileChange}
            onFileRemove={handleFileRemove}
          />
        )}

        {/* Session Created - Waiting to Start */}
        {!connected && sessionCreated && (
          <div className="max-w-7xl mx-auto mb-6">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border-4 border-emerald-200 dark:border-emerald-800 rounded-3xl p-6 flex items-start gap-4">
              <ICONS.CheckCircle className="w-6 h-6 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-emerald-800 dark:text-emerald-300 text-lg mb-2">Learning Session Ready!</h3>
                <p className="text-emerald-700 dark:text-emerald-400 mb-3">
                  Your study material has been processed. Click "Start Voice Session" above to begin your interactive tutoring session.
                </p>
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-500">
                  <ICONS.FileText className="w-4 h-4" />
                  <span className="font-medium">{selectedFile?.name}</span>
                  <span>•</span>
                  <span>{(selectedFile?.size || 0 / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          
          {/* Left Column - Session Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Card */}
            <SessionStatus connected={connected} status={status} />

            {/* Session Stats */}
            {connected && (
              <SessionStatsCard
                currentTopic={sessionStats.currentTopic}
                questionsAsked={sessionStats.questionsAsked}
                questionsAnswered={sessionStats.questionsAnswered}
                understandingScore={sessionStats.understandingScore}
                attentionScore={sessionStats.attentionScore}
              />
            )}

            {/* Controls */}
            {connected && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-100 dark:border-slate-800 shadow-sm">
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">
                  Controls
                </h2>
                <button
                  onClick={toggleMute}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black transition-all border-b-4 ${
                    muted
                      ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 dark:border-rose-800'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:border-indigo-800'
                  }`}
                >
                  {muted ? <ICONS.MicOff size={24} /> : <ICONS.Mic size={24} />}
                  {muted ? 'Unmute' : 'Mute'}
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Transcript & Visualizer */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Audio Visualizer */}
            {connected && (
              <AudioVisualizer tutorSpeaking={tutorSpeaking} visualizerData={visualizerData} />
            )}

            {/* Transcript */}
            <TranscriptPanel transcript={transcript} connected={connected} />
          </div>

        </div>

        {/* Feature Info Cards - Only show when not connected */}
        {!connected && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 max-w-7xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-2">
                Adaptive Teaching
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                AI adjusts difficulty based on your understanding and engagement in real-time
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-2">
                Natural Conversation
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Speak naturally - no typing required. Learn through voice like with a real teacher
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-2">
                Progress Tracking
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Monitor your understanding score and get insights on topics that need more practice
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


