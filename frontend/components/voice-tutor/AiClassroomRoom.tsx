'use client'

import { LiveKitRoom, VideoConference } from '@livekit/components-react'

interface AiClassroomRoomProps {
  token: string
  serverUrl: string
  onLeave?: () => void
}

export function AiClassroomRoom({ token, serverUrl, onLeave }: AiClassroomRoomProps) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="w-full max-w-5xl h-[70vh] bg-slate-900 border-4 border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          audio
          video
          data-lk-theme="default"
          onDisconnected={onLeave}
          onError={(error) => {
            console.error('LiveKit classroom error:', error)
          }}
          options={{
            publishDefaults: {
              dtx: true,
              red: true,
            },
            audioCaptureDefaults: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
            },
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <div className="h-full w-full lk-room-container">
            <VideoConference />
          </div>
        </LiveKitRoom>
      </div>
    </div>
  )
}

