'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Reply, Edit2, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { showConfirm } from '@/lib/alert';
import chatSocketClient from '@/lib/chatSocket';

interface GroupChatProps {
  groupId: string;
  groupName: string;
  currentUserId: string;
  currentUserEmail: string;
  token: string;
}

interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  conversationType: string;
  group: string;
  messageType: string;
  isEdited: boolean;
  isDeleted: boolean;
  replyTo?: string;
  createdAt: string;
  updatedAt: string;
  readBy: Array<{ user: string; readAt: string }>;
}

export default function GroupChat({
  groupId,
  groupName,
  currentUserId,
  currentUserEmail,
  token,
}: GroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = useCallback(async () => {
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://colab-back.onrender.com/api'}/chat/messages?conversationType=group&groupId=${groupId}&limit=100`;

      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`);
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load messages', variant: 'destructive' });
    }
  }, [groupId, token, toast]);

  useEffect(() => {
    if (!token || !currentUserId || !currentUserEmail) return;

    chatSocketClient.connect(currentUserId, currentUserEmail);

    const checkConnection = () => setIsConnected(chatSocketClient.isConnected());
    checkConnection();
    const connectionCheckInterval = setInterval(checkConnection, 2000);

    chatSocketClient.joinConversation('group', groupId);
    loadMessages();

    const handleNewMessage = (message: Message) => {
      if (message.group === groupId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
    };

    const handleMessageEdited = (message: Message) => {
      setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
        )
      );
    };

    const handleUserTyping = (data: { userId: string; userEmail: string }) => {
      if (data.userId !== currentUserId) {
        setTypingUsers((prev) => [...new Set([...prev, data.userEmail])]);
      }
    };

    const handleUserStoppedTyping = (data: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((email) => email !== data.userId));
    };

    chatSocketClient.onMessageNew(handleNewMessage);
    chatSocketClient.onMessageEdited(handleMessageEdited);
    chatSocketClient.onMessageDeleted(handleMessageDeleted);
    chatSocketClient.onUserTyping(handleUserTyping);
    chatSocketClient.onUserStoppedTyping(handleUserStoppedTyping);

    return () => {
      clearInterval(connectionCheckInterval);
      chatSocketClient.leaveConversation('group', groupId);
      chatSocketClient.offMessageNew(handleNewMessage);
      chatSocketClient.offMessageEdited(handleMessageEdited);
      chatSocketClient.offMessageDeleted(handleMessageDeleted);
      chatSocketClient.offUserTyping(handleUserTyping);
      chatSocketClient.offUserStoppedTyping(handleUserStoppedTyping);
    };
  }, [groupId, currentUserId, currentUserEmail, token, loadMessages]);

  const handleTyping = () => {
    if (!isConnected) return;

    if (!isTyping) {
      setIsTyping(true);
      chatSocketClient.startTyping('group', groupId);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      chatSocketClient.stopTyping('group', groupId);
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isConnected) return;

    const messageData = {
      conversationType: 'group',
      groupId,
      content: editingMessage ? editingMessage.content : newMessage.trim(),
      messageType: 'text',
      replyTo: replyingTo?._id,
    };

    if (editingMessage) {
      chatSocketClient.editMessage(
        editingMessage._id,
        newMessage.trim(),
        (response: { error?: string; success?: boolean }) => {
          if (response.error) {
            toast({ title: 'Error', description: response.error, variant: 'destructive' });
          }
        }
      );
      setEditingMessage(null);
    } else {
      chatSocketClient.sendMessage(messageData, (response: { error?: string; success?: boolean }) => {
        if (response.error) {
          toast({ title: 'Error', description: response.error, variant: 'destructive' });
        }
      });
    }

    setNewMessage('');
    setReplyingTo(null);
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!isConnected) return;
    showConfirm(
      'Delete this message?',
      () => {
        chatSocketClient.deleteMessage(messageId, (response: { error?: string }) => {
          if (response.error) {
            toast({ title: 'Error', description: response.error, variant: 'destructive' });
          }
        });
      },
      'Delete Message',
      'Delete',
      'Cancel'
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-3 pb-2">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-slate-400 dark:text-slate-500">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender._id === currentUserId;
                const isDeleted = message.isDeleted;

                return (
                  <div key={message._id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {!isOwn && (
                      <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                        <AvatarImage src={message.sender.avatar} />
                        <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                          {message.sender.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      {!isOwn && (
                        <span className="text-[10px] font-medium text-slate-400 mb-0.5 px-1">
                          {message.sender.name}
                        </span>
                      )}

                      <div className={`group relative ${isDeleted ? 'opacity-50' : ''}`}>
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-sm ${
                            isOwn
                              ? 'bg-indigo-500 text-white rounded-br-md'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md'
                          } ${isDeleted ? 'italic' : ''}`}
                        >
                          <p className="break-words whitespace-pre-wrap">{message.content}</p>
                          {message.isEdited && !isDeleted && (
                            <span className="text-[10px] opacity-70 ml-1">(edited)</span>
                          )}
                        </div>

                        {/* Hover actions — own messages */}
                        {!isDeleted && isOwn && (
                          <div className="absolute -top-3 right-0 hidden group-hover:flex gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm p-0.5">
                            <button
                              onClick={() => {
                                setEditingMessage(message);
                                setNewMessage(message.content);
                              }}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Hover actions — other's messages */}
                        {!isDeleted && !isOwn && (
                          <div className="absolute -top-3 left-0 hidden group-hover:flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm p-0.5">
                            <button
                              onClick={() => setReplyingTo(message)}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                            >
                              <Reply className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <p className="text-xs text-indigo-500 italic mt-2 px-1">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </p>
          )}
        </ScrollArea>
      </div>

      {/* Reply/Edit bar */}
      {(replyingTo || editingMessage) && (
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {editingMessage ? 'Editing message' : `Replying to ${replyingTo?.sender.name}`}
            </span>
            <p className="text-xs text-slate-400 truncate max-w-sm">
              {editingMessage?.content || replyingTo?.content}
            </p>
          </div>
          <button
            onClick={() => {
              setReplyingTo(null);
              setEditingMessage(null);
              setNewMessage('');
            }}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={editingMessage ? 'Edit your message...' : 'Type a message...'}
            className="h-9 text-sm"
            disabled={!isConnected}
          />
          <Button
            onClick={handleSendMessage}
            size="sm"
            disabled={!newMessage.trim() || !isConnected}
            className="bg-indigo-500 hover:bg-indigo-600 text-white h-9 px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {!isConnected && (
          <p className="text-[10px] text-red-400 mt-1">Disconnected — reconnecting...</p>
        )}
      </div>
    </div>
  );
}
