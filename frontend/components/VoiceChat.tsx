'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './UIElements';
import { ICONS } from '../constants';
import { apiClient } from '../src/lib/api';

// Declare Jitsi API for TypeScript
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface Participant {
  userId: string;
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isVideoOn: boolean;
}

interface VoiceChatProps {
  boardId: string;
  onClose?: () => void;
  onJoinCall?: () => void;
  onLeaveCall?: () => void;
}

export const VoiceChat: React.FC<VoiceChatProps> = ({ boardId, onClose, onJoinCall, onLeaveCall }) => {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const jitsiApiRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const joinCall = async () => {
    setIsJoining(true);
    setError(null);
    
    // Wait for next render cycle to ensure container is mounted
    await new Promise(resolve => setTimeout(resolve, 50));
    
    setIsLoading(true);
    
    try {
      // Get Jitsi room from backend
      const response = await apiClient.get(`/boards/${boardId}/voice-room`);
      console.log('[VoiceChat] API Response:', response);
      
      const { domain, roomName, displayName } = response.room;

      // Ensure container is ready
      if (!containerRef.current) {
        throw new Error('Container not ready');
      }

      // Load Jitsi script if not already loaded
      if (!window.JitsiMeetExternalAPI) {
        await loadJitsiScript(domain);
      }

      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create Jitsi conference
      const api = new window.JitsiMeetExternalAPI(domain, {
        roomName: roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: 400,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: true,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'hangup', 'chat',
            'settings', 'raisehand', 'tileview'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
        userInfo: {
          displayName: displayName
        }
      });

      jitsiApiRef.current = api;

      // Set up event listeners
      api.on('videoConferenceJoined', handleJoinedMeeting);
      api.on('participantJoined', handleParticipantUpdate);
      api.on('participantLeft', handleParticipantUpdate);
      api.on('videoConferenceLeft', handleLeftMeeting);
      api.on('errorOccurred', handleError);

      // Listen to audio/video mute changes
      api.on('audioMuteStatusChanged', (e: any) => setIsMuted(e.muted));
      api.on('videoMuteStatusChanged', (e: any) => setIsVideoOn(!e.muted));
      
      setIsJoined(true);
      onJoinCall?.();
    } catch (error: any) {
      console.error('Failed to join call:', error);
      setError(error.message || 'Failed to join voice chat');
      setIsJoining(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadJitsiScript = (domain: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src*="${domain}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Jitsi script'));
      document.head.appendChild(script);
    });
  };

  const leaveCall = useCallback(async () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    setIsJoining(false);
    setIsJoined(false);
    setIsMuted(false);
    setIsVideoOn(false);
    setParticipants([]);
    onLeaveCall?.();
    onClose?.();
  }, [onClose, onLeaveCall]);

  const handleJoinedMeeting = useCallback(() => {
    console.log('Joined meeting');
    updateParticipants();
  }, []);

  const handleParticipantUpdate = useCallback(() => {
    updateParticipants();
  }, []);

  const handleLeftMeeting = useCallback(() => {
    setIsJoined(false);
    setParticipants([]);
  }, []);

  const handleError = useCallback((error: any) => {
    console.error('Daily call error:', error);
    setError('Voice chat error occurred');
  }, []);

  const updateParticipants = useCallback(() => {
    if (!jitsiApiRef.current) return;

    jitsiApiRef.current.getParticipantsInfo().then((participants: any[]) => {
      const participantList: Participant[] = participants
        .filter((p: any) => !p.isLocal)
        .map((p: any) => ({
          userId: p.participantId,
          name: p.displayName || 'Guest',
          isMuted: false,
          isSpeaking: false,
          isVideoOn: false,
        }));

      setParticipants(participantList);
    });
  }, []);

  const toggleMute = async () => {
    if (!jitsiApiRef.current) return;
    
    if (isMuted) {
      jitsiApiRef.current.executeCommand('unmuteAudio');
    } else {
      jitsiApiRef.current.executeCommand('muteAudio');
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = async () => {
    if (!jitsiApiRef.current) return;
    
    if (isVideoOn) {
      jitsiApiRef.current.executeCommand('muteVideo');
    } else {
      jitsiApiRef.current.executeCommand('unmuteVideo');
    }
    setIsVideoOn(!isVideoOn);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, []);

  if (!isJoined && !isJoining) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-slate-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ICONS.Phone className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Voice Chat</h3>
          <p className="text-sm text-slate-600 mb-4">
            Join voice chat to collaborate with your team<br/>
            <span className="text-xs text-green-600">✨ Powered by Jitsi Meet - 100% Free!</span>
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          <Button 
            onClick={joinCall} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Joining...' : 'Join Voice Chat'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <ICONS.Phone className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-white"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg">Voice Chat</span>
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-xs text-white font-medium">
                  Live
                </span>
              </div>
              {participants.length > 0 && (
                <span className="text-sm text-white/80 flex items-center gap-1 mt-1">
                  <ICONS.Users className="w-3 h-3" />
                  {participants.length + 1} participant{participants.length > 0 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10 transition-all p-2 rounded-lg"
            title="Close"
          >
            <ICONS.X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Jitsi Meet container */}
      {isLoading && !isJoined && (
        <div className="flex items-center justify-center h-[450px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="text-center text-white">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-500/30 border-t-indigo-500 mx-auto mb-4"></div>
              <ICONS.Phone className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-lg font-medium">Connecting to voice chat...</p>
            <p className="text-sm text-slate-400 mt-2">Please wait a moment</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="bg-slate-900" style={{ minHeight: '450px', display: isLoading && !isJoined ? 'none' : 'block' }} />

      {/* Controls */}
      <div className="border-t border-slate-200/50 bg-white/80 backdrop-blur-md">
        <div className="p-6">
          <div className="flex items-center justify-center gap-3">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`group relative flex items-center gap-3 px-6 py-3 rounded-2xl font-medium transition-all duration-200 ${
                isMuted 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <ICONS.MicOff className="w-5 h-5" /> : <ICONS.Mic className="w-5 h-5" />}
              <span className="text-sm font-semibold">{isMuted ? 'Muted' : 'Unmute'}</span>
            </button>
            
            {/* Video Button */}
            <button
              onClick={toggleVideo}
              className={`group relative flex items-center gap-3 px-6 py-3 rounded-2xl font-medium transition-all duration-200 ${
                isVideoOn 
                  ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300'
              }`}
              title={isVideoOn ? 'Turn off video' : 'Turn on video'}
            >
              {isVideoOn ? <ICONS.Video className="w-5 h-5" /> : <ICONS.VideoOff className="w-5 h-5" />}
              <span className="text-sm font-semibold">{isVideoOn ? 'Video On' : 'Video Off'}</span>
            </button>

            {/* Leave Button */}
            <button
              onClick={leaveCall}
              className="group relative flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl font-semibold transition-all duration-200 shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
              title="Leave call"
            >
              <ICONS.Phone className="w-5 h-5" />
              <span className="text-sm">Leave Call</span>
            </button>
          </div>
          
          {/* Info Badge */}
          <div className="mt-4 text-center">
            <span className="text-xs text-slate-500 inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Powered by Jitsi Meet - 100% Free
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;
