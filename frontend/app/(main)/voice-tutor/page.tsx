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
import { AiClassroomRoom } from '@/components/voice-tutor/AiClassroomRoom'
import { useVoiceSession } from '@/hooks/useVoiceSession'
import { useScheduledClasses, ScheduledClass } from '@/hooks/useScheduledClasses'

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

  const {
    classes: scheduledClasses,
    loading: loadingClasses,
    error: classesError,
    scheduling,
    scheduleError,
    scheduleClass,
    joiningClassId,
    startClass,
  } = useScheduledClasses()

  const [scheduleTitle, setScheduleTitle] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [scheduleDuration, setScheduleDuration] = useState(60)

  const [activeClassroom, setActiveClassroom] = useState<{
    token: string
    wsUrl: string
    sessionId: string
    title: string
  } | null>(null)

  const isClassroomConnected = connected || !!activeClassroom

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
        resetSessionState()
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

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleTitle || !scheduleDate || !scheduleTime) {
      return
    }
    try {
      await scheduleClass({
        title: scheduleTitle,
        notebookId: 'general',
        source: undefined,
        date: scheduleDate,
        time: scheduleTime,
        durationMinutes: scheduleDuration,
      })
      setScheduleTitle('')
      setScheduleDate('')
      setScheduleTime('')
      setScheduleDuration(60)
    } catch {
      // errors already handled in hook
    }
  }

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

        {/* Scheduled Classes Section */}
        {!connected && (
          <div className="max-w-7xl mx-auto mb-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Schedule form */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-100 dark:border-slate-800 shadow-sm">
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-3">
                Schedule AI Classroom
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Book a 1:1 virtual class with the voice tutor at a specific time.
              </p>
              <form className="space-y-3" onSubmit={handleScheduleSubmit}>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={scheduleTitle}
                    onChange={(e) => setScheduleTitle(e.target.value)}
                    placeholder="e.g. Calculus revision session"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    step={15}
                    value={scheduleDuration}
                    onChange={(e) => setScheduleDuration(Number(e.target.value) || 60)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {scheduleError && (
                  <p className="text-xs text-rose-500 dark:text-rose-400">{scheduleError}</p>
                )}
                <Button
                  type="submit"
                  disabled={scheduling || !scheduleTitle || !scheduleDate || !scheduleTime}
                  className="mt-1 w-full gap-2 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ICONS.Planner className="w-4 h-4" />
                  {scheduling ? 'Scheduling...' : 'Schedule Class'}
                </Button>
              </form>
            </div>

            {/* Upcoming classes */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb  -3">
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-200">
                  Upcoming Classes
                </h2>
                {loadingClasses && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">Loading...</span>
                )}
              </div>
              {classesError && (
                <p className="text-xs text-rose-500 dark:text-rose-400 mb-2">{classesError}</p>
              )}
              {scheduledClasses.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  No classes scheduled yet. Create one on the left to get started.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {scheduledClasses.map((cls) => {
                    const date = new Date(cls.scheduled_start)
                    const isJoinable = cls.status === 'scheduled' || cls.status === 'started'
                    return (
                      <div
                        key={cls.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {cls.title}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {cls.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {cls.duration_minutes} min
                          </p>
                        </div>
                        <Button
                          disabled={!isJoinable || joiningClassId === cls.id}
                          onClick={async () => {
                            try {
                              setStatus('Starting scheduled class...')
                              const creds = await startClass(cls.id)
                              setActiveClassroom({
                                token: creds.token,
                                wsUrl: creds.wsUrl,
                                sessionId: creds.sessionId,
                                title: cls.title,
                              })
                            } catch (err: any) {
                              console.error('Failed to start class', err)
                              setError(err?.message || 'Failed to start class')
                            }
                          }}
                          className="gap-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ICONS.Video className="w-4 h-4" />
                          {joiningClassId === cls.id ? 'Joining...' : 'Join'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
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
            <SessionStatus connected={isClassroomConnected} status={status} />

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
      {/* Full-screen AI Classroom for scheduled classes */}
      {activeClassroom && (
        <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-5xl mb-3 flex items-center justify-between px-6 py-3 bg-slate-950/90 border border-slate-800 rounded-2xl shadow-lg">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                AI Classroom
              </p>
              <p className="text-sm font-bold text-slate-100">{activeClassroom.title}</p>
            </div>
            <Button
              onClick={() => {
                setActiveClassroom(null)
              }}
              className="gap-2 bg-rose-500 hover:bg-rose-600 text-white"
            >
              <ICONS.Phone className="w-4 h-4" />
              Leave Class
            </Button>
          </div>
          <div className="w-full max-w-5xl">
            <AiClassroomRoom
              token={activeClassroom.token}
              serverUrl={activeClassroom.wsUrl}
              onLeave={() => {
                setActiveClassroom(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}


