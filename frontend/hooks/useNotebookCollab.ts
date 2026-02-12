import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { ChatMessage } from '@/components/study-notebook/ChatPanel';

interface Participant {
    userId: string;
    displayName: string;
    avatar?: string;
    isOnline: boolean;
}

interface UseNotebookCollabProps {
    notebookId: string;
    onMessageReceived?: (message: ChatMessage) => void;
    onTokenReceived?: (token: string, messageId: string) => void;
    onSourceUpdate?: (action: string, source: any) => void;
    onChatClear?: () => void;
}

export function useNotebookCollab({
    notebookId,
    onMessageReceived,
    onTokenReceived,
    onSourceUpdate,
    onChatClear
}: UseNotebookCollabProps) {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    const user = useAuthStore(s => s.user);
    const accessToken = useAuthStore(s => s.accessToken);
    const socketRef = useRef<Socket | null>(null);

    // Use refs for callbacks to avoid effect re-runs when they change
    const onMessageReceivedRef = useRef(onMessageReceived);
    const onTokenReceivedRef = useRef(onTokenReceived);
    const onSourceUpdateRef = useRef(onSourceUpdate);
    const onChatClearRef = useRef(onChatClear);

    useEffect(() => {
        onMessageReceivedRef.current = onMessageReceived;
        onTokenReceivedRef.current = onTokenReceived;
        onSourceUpdateRef.current = onSourceUpdate;
        onChatClearRef.current = onChatClear;
    }, [onMessageReceived, onTokenReceived, onSourceUpdate, onChatClear]);

    useEffect(() => {
        if (!notebookId || !user || !accessToken) return;

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
        const newSocket = io(`${socketUrl}/notebook-collab`, {
            auth: { token: accessToken },
            transports: ['websocket']
        });

        socketRef.current = newSocket;

        // Join notebook room
        newSocket.emit('notebook:join', {
            notebookId,
            userId: user.id,
            displayName: user.name,
            avatar: user.avatar
        });

        // Event Listeners
        newSocket.on('presence:update', ({ participants }) => {
            setParticipants(participants);
        });

        newSocket.on('user:typing', ({ userId, displayName, isTyping }) => {
            setTypingUsers(prev =>
                isTyping
                    ? [...prev.filter(name => name !== displayName), displayName]
                    : prev.filter(name => name !== displayName)
            );
        });

        newSocket.on('ai:token', ({ token, messageId }) => {
            if (onTokenReceivedRef.current) onTokenReceivedRef.current(token, messageId);
        });

        newSocket.on('chat:message', (message: ChatMessage) => {
            if (onMessageReceivedRef.current) onMessageReceivedRef.current(message);
        });

        newSocket.on('ai:complete', ({ message, messageId }) => {
            if (onMessageReceivedRef.current) {
                onMessageReceivedRef.current({
                    id: messageId,
                    role: 'assistant',
                    content: message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        newSocket.on('source:update', ({ action, source }) => {
            if (onSourceUpdateRef.current) onSourceUpdateRef.current(action, source);
        });

        newSocket.on('chat:clear', () => {
            if (onChatClearRef.current) onChatClearRef.current();
        });

        return () => {
            newSocket.disconnect();
            socketRef.current = null;
        };
    }, [notebookId, user?.id, accessToken]);

    const sendTyping = useCallback((isTyping: boolean) => {
        if (socketRef.current && notebookId && user) {
            socketRef.current.emit('user:typing', {
                notebookId,
                userId: user.id,
                displayName: user.name,
                isTyping
            });
        }
    }, [notebookId, user]);

    const broadcastChatMessage = useCallback((message: ChatMessage) => {
        if (socketRef.current && notebookId) {
            socketRef.current.emit('chat:message', {
                notebookId,
                message
            });
        }
    }, [notebookId]);

    const broadcastAIToken = useCallback((token: string, messageId: string) => {
        if (socketRef.current && notebookId) {
            socketRef.current.emit('ai:token', {
                notebookId,
                token,
                messageId
            });
        }
    }, [notebookId]);

    const broadcastAIComplete = useCallback((message: string, messageId: string) => {
        if (socketRef.current && notebookId) {
            socketRef.current.emit('ai:complete', {
                notebookId,
                message,
                messageId
            });
        }
    }, [notebookId]);

    const broadcastSourceUpdate = useCallback((action: string, source: any) => {
        if (socketRef.current && notebookId) {
            socketRef.current.emit('source:update', {
                notebookId,
                action,
                source
            });
        }
    }, [notebookId]);

    const broadcastChatClear = useCallback(() => {
        if (socketRef.current && notebookId) {
            socketRef.current.emit('chat:clear', {
                notebookId
            });
        }
    }, [notebookId]);

    return {
        participants,
        typingUsers,
        sendTyping,
        broadcastChatMessage,
        broadcastAIToken,
        broadcastAIComplete,
        broadcastSourceUpdate,
        broadcastChatClear
    };
}
