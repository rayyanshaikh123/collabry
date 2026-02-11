'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react'

interface VoiceTutorProps {
  params: {
    id: string // notebook ID
  }
}

interface ConversationTurn {
  speaker: 'student' | 'tutor'
  text: string
  timestamp: string
}

export default function VoiceTutorPage({ params }: VoiceTutorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [roomName, setRoomName] = useState<string>()
  const [sessionId, setSessionId] = useState<string>()
  const [transcript, setTranscript] = useState<ConversationTurn[]>([])
  const [status, setStatus] = useState('Initializing...')
  const [tutorSpeaking, setTutorSpeaking] = useState(false)

  // Create voice tutor room on mount
  useEffect(() => {
    createRoom()
  }, [params.id])

  const createRoom = async () => {
    try {
      setStatus('Creating voice session...')

      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000'}/voice/rooms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notebook_id: params.id,
            username: localStorage.getItem('username') || 'Student',
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to create voice session')
      }

      const data = await response.json()
      setRoomName(data.room_name)
      setSessionId(data.session_id)
      setStatus('Connecting to tutor...')

      // In a full implementation, you would:
      // 1. Connect to LiveKit using @livekit/components-react
      // 2. Set up audio tracks
      // 3. Handle real-time transcription display

      // For MVP/demo, we simulate connection
      setTimeout(() => {
        setConnected(true)
        setLoading(false)
        setStatus('Connected')
        addTutorMessage(
          "Hello! I'm your AI tutor. I'm here to help you learn about the topics in your notebook. Let's start our lesson!"
        )
      }, 2000)
    } catch (error) {
      console.error('Error creating room:', error)
      setStatus('Failed to connect. Please try again.')
      setLoading(false)
    }
  }

  const addTutorMessage = (text: string) => {
    setTranscript((prev) => [
      ...prev,
      {
        speaker: 'tutor',
        text,
        timestamp: new Date().toISOString(),
      },
    ])
    // Simulate speaking animation
    setTutorSpeaking(true)
    setTimeout(() => setTutorSpeaking(false), text.length * 50) // ~50ms per character
  }

  const addStudentMessage = (text: string) => {
    setTranscript((prev) => [
      ...prev,
      {
        speaker: 'student',
        text,
        timestamp: new Date().toISOString(),
      },
    ])
  }

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev)
    // In full implementation, mute/unmute audio track
  }, [])

  const endSession = async () => {
    if (!sessionId) return

    try {
      setStatus('Ending session...')

      const token = localStorage.getItem('token')
      await fetch(
        `${process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000'}/voice/sessions/${sessionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setConnected(false)
      router.push(`/study-notebook/${params.id}`)
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
          <p className="text-lg font-medium">{status}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Voice Tutor</h1>
            <p className="text-sm text-gray-500">{status}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={muted ? 'destructive' : 'outline'}
              size="icon"
              onClick={toggleMute}
              disabled={!connected}
            >
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button variant="destructive" onClick={endSession} disabled={!connected}>
              <PhoneOff className="mr-2 h-4 w-4" />
              End Session
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Transcript Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transcript.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <Mic className="mx-auto mb-2 h-12 w-12 opacity-50" />
                    <p>Waiting for conversation to start...</p>
                    <p className="mt-2 text-sm">The tutor will greet you momentarily</p>
                  </div>
                ) : (
                  transcript.map((turn, index) => (
                    <div
                      key={index}
                      className={`rounded-lg p-4 ${
                        turn.speaker === 'tutor'
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : 'bg-green-50 border-l-4 border-green-500'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-semibold">
                          {turn.speaker === 'tutor' ? '🤖 Tutor' : '👤 You'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(turn.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-800">{turn.text}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Voice/Status Panel */}
        <div className="w-96 border-l bg-white p-6">
          <Card>
            <CardHeader>
              <CardTitle>Voice Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Voice Visualizer */}
              <div className="flex flex-col items-center justify-center py-8">
                <div
                  className={`mb-4 flex h-32 w-32 items-center justify-center rounded-full transition-all ${
                    tutorSpeaking
                      ? 'scale-110 bg-blue-500 shadow-lg shadow-blue-500/50 animate-pulse'
                      : 'scale-100 bg-gray-300'
                  }`}
                >
                  <Mic className={`h-16 w-16 ${tutorSpeaking ? 'text-white' : 'text-gray-500'}`} />
                </div>
                <p className="text-center font-medium">
                  {tutorSpeaking ? 'Tutor is speaking...' : muted ? 'Microphone muted' : 'Listening...'}
                </p>
              </div>

              {/* Session Info */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-green-600">{status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Session ID:</span>
                  <span className="font-mono text-xs">{sessionId?.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Messages:</span>
                  <span className="font-medium">{transcript.length}</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="mb-2 text-sm font-semibold text-blue-900">How it works:</h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  <li>• Speak naturally - the tutor will listen</li>
                  <li>• Answer questions when asked</li>
                  <li>• Ask questions anytime</li>
                  <li>• The tutor adapts to your pace</li>
                </ul>
              </div>

              {/* Note for MVP */}
              <div className="rounded-lg bg-yellow-50 p-4">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> This is a demo interface. Full LiveKit integration requires
                  LiveKit credentials and the @livekit/components-react library.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
