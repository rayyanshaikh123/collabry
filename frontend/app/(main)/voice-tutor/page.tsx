'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ICONS } from '../../../constants'
import { Button } from '../../../components/UIElements'
import { useAuthStore } from '../../../src/stores/auth.store'
import { LiveKitRoom, useParticipants, useTracks, RoomAudioRenderer } from '@livekit/components-react'
import { Track } from 'livekit-client'

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
  const router = useRouter()
  const { accessToken, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [sessionCreated, setSessionCreated] = useState(false)
  const [muted, setMuted] = useState(false)
  const [source, setSource] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [roomName, setRoomName] = useState<string>()
  const [sessionId, setSessionId] = useState<string>()
  const [token, setToken] = useState<string>()
  const [wsUrl, setWsUrl] = useState<string>()
  const [transcript, setTranscript] = useState<ConversationTurn[]>([])
  const [status, setStatus] = useState('Ready to start')
  const [error, setError] = useState<string | null>(null)
  const [tutorSpeaking, setTutorSpeaking] = useState(false)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    duration: 0,
    questionsAsked: 0,
    questionsAnswered: 0,
    currentTopic: 'Not started',
    understandingScore: 0,
    attentionScore: 1.0,
  })
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | undefined>(undefined)
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(20).fill(0))

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)

    // Read file content
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setSource(content)
    }
    reader.readAsText(file)
  }

  const createLearningSession = async () => {
    if (!selectedFile || !source) {
      setError('Please upload study material before creating a session')
      return
    }

    try {
      setLoading(true)
      setStatus('Creating learning session...')
      setError(null)

      console.log('Authenticated:', isAuthenticated)
      console.log('Access token exists:', !!accessToken)
      
      if (!accessToken || !isAuthenticated) {
        setStatus('Please log in to create a session')
        setError('No authentication token found. Please log in.')
        setLoading(false)
        router.push('/login?redirect=/voice-tutor')
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000'
      const endpoint = `${apiUrl}/voice/rooms`
      console.log('Calling API:', endpoint)

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
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (!response.ok) {
        let errorData
        const contentType = response.headers.get('content-type')
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json()
        } else {
          const text = await response.text()
          errorData = { detail: text || `HTTP ${response.status}: ${response.statusText}` }
        }
        
        console.error('Error response:', errorData)
        const errorMessage = errorData.detail || errorData.message || `Request failed with status ${response.status}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('Session created:', data)
      setToken(data.student_token)
      setWsUrl(data.ws_url)
      setRoomName(data.room_name)
      setSessionId(data.session_id)
      setSessionCreated(true)
      setStatus('Learning session ready. Click "Start Voice Session" to begin.')
      setLoading(false)
      setError(null)
    } catch (error) {
      console.error('=== Learning Session Error ===')
      console.error('Error type:', typeof error)
      console.error('Error object:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A')
      console.error('========================')
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session'
      setStatus('Error: ' + errorMessage)
      setError(errorMessage)
      setLoading(false)
    }
  }

  const startVoiceSession = async () => {
    if (!sessionCreated || !roomName || !token || !wsUrl) {
      setError('Please create a learning session first')
      return
    }

    setStatus('Connecting to voice tutor...')
    setConnected(true)
  }

  const createRoom = async () => {
    try {
      setLoading(true)
      setStatus('Creating voice session...')
      setError(null)

      console.log('Authenticated:', isAuthenticated)
      console.log('Access token exists:', !!accessToken)
      
      if (!accessToken || !isAuthenticated) {
        setStatus('Please log in to start a voice session')
        setError('No authentication token found. Please log in.')
        setLoading(false)
        router.push('/login?redirect=/voice-tutor')
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000'
      const endpoint = `${apiUrl}/voice/rooms`
      console.log('Calling API:', endpoint)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          notebook_id: 'general',
          username: 'Student',
          source: source || undefined,
        }),
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (!response.ok) {
        let errorData
        const contentType = response.headers.get('content-type')
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json()
        } else {
          const text = await response.text()
          errorData = { detail: text || `HTTP ${response.status}: ${response.statusText}` }
        }
        
        console.error('Error response:', errorData)
        const errorMessage = errorData.detail || errorData.message || `Request failed with status ${response.status}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('Room created:', data)
      setRoomName(data.room_name)
      setSessionId(data.session_id)
      setToken(data.student_token)
      setWsUrl(data.ws_url)
      setConnected(true)
      setStatus('Connecting to AI tutor...')

      setLoading(false)
      setError(null)
    } catch (error) {
      console.error('=== Voice Tutor Error ===')
      console.error('Error type:', typeof error)
      console.error('Error object:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A')
      console.error('========================')
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session'
      setStatus('Error: ' + errorMessage)
      setError(errorMessage)
      setLoading(false)
    }
  }

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

      setConnected(false)
      setSessionCreated(false)
      setRoomName(undefined)
      setSessionId(undefined)
      setSelectedFile(null)
      setSource('')
      setStatus('Session ended')
      setTranscript([])
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

  const handleTranscriptUpdate = useCallback((turn: ConversationTurn) => {
    setTranscript(prev => [...prev, turn])
  }, [])

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
            onTranscriptUpdate={handleTranscriptUpdate}
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
          <div className="max-w-7xl mx-auto mb-6">
            <div className="bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Upload Study Material
                </label>
                <span className="text-rose-500 dark:text-rose-400 text-sm font-black">*Required</span>
              </div>
              <div className="relative">
                <input
                  type="file"
                  accept=".txt,.md,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-3 w-full p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 cursor-pointer transition-colors"
                >
                  {selectedFile ? (
                    <>
                      <ICONS.FileText className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                      <div className="text-center">
                        <p className="font-bold text-slate-700 dark:text-slate-300">{selectedFile.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          setSelectedFile(null)
                          setSource('')
                        }}
                        className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
                      >
                        <ICONS.X className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <ICONS.Upload className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                      <div className="text-center">
                        <p className="font-bold text-slate-700 dark:text-slate-300">Click to upload study material</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          TXT, MD, PDF, DOC, or DOCX files
                        </p>
                      </div>
                    </>
                  )}
                </label>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Upload your study material (notes, textbooks, documents) to create a personalized learning session. The AI tutor will use this content to guide the conversation.
              </p>
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">
                  {connected ? 'Connected' : 'Disconnected'}
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                {status}
              </p>
            </div>

            {/* Session Stats */}
            {connected && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">
                  Session Stats
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Current Topic
                    </p>
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {sessionStats.currentTopic}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Questions Asked
                    </p>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                      {sessionStats.questionsAsked}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Questions Answered
                    </p>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                      {sessionStats.questionsAnswered}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Understanding Score
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${sessionStats.understandingScore * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                        {Math.round(sessionStats.understandingScore * 100)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Attention Score
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 dark:bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${sessionStats.attentionScore * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                        {Math.round(sessionStats.attentionScore * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border-4 border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-center gap-2 h-32">
                  {visualizerData.map((height, i) => (
                    <div
                      key={i}
                      className="w-2 bg-gradient-to-t from-indigo-500 to-indigo-300 dark:from-indigo-600 dark:to-indigo-400 rounded-full transition-all duration-100"
                      style={{ 
                        height: `${Math.max(10, height)}%`,
                        opacity: tutorSpeaking ? 0.8 : 0.2,
                      }}
                    />
                  ))}
                </div>
                {tutorSpeaking && (
                  <p className="text-center text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-4">
                    Tutor is speaking...
                  </p>
                )}
              </div>
            )}

            {/* Transcript */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-4 border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col" style={{ height: connected ? '500px' : 'auto' }}>
              <div className="px-6 py-4 border-b-4 border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">
                  Conversation Transcript
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {transcript.length === 0 && !connected && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎓</div>
                    <p className="text-slate-500 dark:text-slate-400 font-semibold">
                      Start a voice session to begin learning
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                      Your AI tutor will teach through interactive conversation
                    </p>
                  </div>
                )}

                {transcript.length === 0 && connected && (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-slate-500 dark:text-slate-400 font-semibold">
                      Waiting for tutor...
                    </p>
                  </div>
                )}

                {transcript.map((turn, i) => (
                  <div
                    key={i}
                    className={`flex ${turn.speaker === 'student' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                        turn.speaker === 'student'
                          ? 'bg-indigo-500 dark:bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {turn.speaker === 'student' ? '👤' : '🤖'}
                        </span>
                        <span className="text-xs font-black uppercase opacity-70">
                          {turn.speaker === 'student' ? 'You' : 'Tutor'}
                        </span>
                      </div>
                      <p className="font-medium text-sm leading-relaxed">
                        {turn.text}
                      </p>
                      <p className={`text-xs mt-2 opacity-60 ${
                        turn.speaker === 'student' ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {new Date(turn.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>
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
