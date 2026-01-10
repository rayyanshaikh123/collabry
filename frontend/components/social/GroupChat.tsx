'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Paperclip, Smile, Reply, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import chatSocketClient from '@/src/lib/chatSocket';

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

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages function with useCallback to prevent unnecessary re-renders
  const loadMessages = useCallback(async () => {
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api'}/chat/messages?conversationType=group&groupId=${groupId}&limit=100`;
      
      console.log('📥 Loading messages from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to load messages:', response.status, errorText);
        throw new Error(`Failed to load messages: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Loaded messages:', data.messages?.length || 0);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    }
  }, [groupId, token, toast]);

  // Initialize socket connection using shared chatSocketClient
  useEffect(() => {
    if (!token) {
      console.warn('⚠️ No token provided');
      return;
    }

    if (!currentUserId || !currentUserEmail) {
      console.warn('⚠️ User ID or email missing:', { currentUserId, currentUserEmail });
      return;
    }

    console.log('🔌 [GroupChat] Initializing connection...');
    console.log('🔌 [GroupChat] Group ID:', groupId);
    console.log('🔌 [GroupChat] User ID:', currentUserId);

    // Connect using shared socket client
    chatSocketClient.connect(currentUserId, currentUserEmail);
    
    // Update connection status periodically or listen to socket events
    const checkConnection = () => {
      const connected = chatSocketClient.isConnected();
      setIsConnected(connected);
      console.log('🔌 [GroupChat] Connection status:', connected);
    };
    
    // Check immediately
    checkConnection();
    
    // Check connection every 2 seconds
    const connectionCheckInterval = setInterval(checkConnection, 2000);

    // Join group room
    console.log('📥 [GroupChat] Joining group room...');
    chatSocketClient.joinConversation('group', groupId);
    
    // Load initial messages
    loadMessages();

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      console.log('📨 [GroupChat] New message received:', message);
      if (message.group === groupId) {
        setMessages((prev) => [...prev, message]);
      }
    };

    // Listen for message edits
    const handleMessageEdited = (message: Message) => {
      console.log('✏️ [GroupChat] Message edited:', message._id);
      setMessages((prev) =>
        prev.map((m) => (m._id === message._id ? message : m))
      );
    };

    // Listen for message deletes
    const handleMessageDeleted = (data: { messageId: string }) => {
      console.log('🗑️ [GroupChat] Message deleted:', data.messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
        )
      );
    };

    // Listen for typing indicators
    const handleUserTyping = (data: { userId: string; userEmail: string }) => {
      if (data.userId !== currentUserId) {
        setTypingUsers((prev) => [...new Set([...prev, data.userEmail])]);
      }
    };

    const handleUserStoppedTyping = (data: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((email) => email !== data.userId));
    };

    // Register event listeners
    chatSocketClient.onMessageNew(handleNewMessage);
    chatSocketClient.onMessageEdited(handleMessageEdited);
    chatSocketClient.onMessageDeleted(handleMessageDeleted);
    chatSocketClient.onUserTyping(handleUserTyping);
    chatSocketClient.onUserStoppedTyping(handleUserStoppedTyping);

    return () => {
      console.log('🔌 [GroupChat] Cleaning up...');
      clearInterval(connectionCheckInterval);
      chatSocketClient.leaveConversation('group', groupId);
      
      // Remove event listeners
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

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      chatSocketClient.stopTyping('group', groupId);
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isConnected) {
      console.warn('⚠️ Cannot send message:', {
        hasMessage: !!newMessage.trim(),
        isConnected,
      });
      return;
    }

    const messageData = {
      conversationType: 'group',
      groupId,
      content: editingMessage ? editingMessage.content : newMessage.trim(),
      messageType: 'text',
      replyTo: replyingTo?._id,
    };

    console.log('📤 Sending message:', messageData);

    if (editingMessage) {
      // Edit existing message
      chatSocketClient.editMessage(
        editingMessage._id,
        newMessage.trim(),
        (response: { error?: string; success?: boolean }) => {
          console.log('📝 Edit response:', response);
          if (response.error) {
            toast({
              title: 'Error',
              description: response.error,
              variant: 'destructive',
            });
          }
        }
      );
      setEditingMessage(null);
    } else {
      // Send new message
      chatSocketClient.sendMessage(messageData, (response: { error?: string; success?: boolean }) => {
        console.log('📤 Send response:', response);
        if (response.error) {
          toast({
            title: 'Error',
            description: response.error,
            variant: 'destructive',
          });
        }
      });
    }

    setNewMessage('');
    setReplyingTo(null);
    setIsTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!isConnected) return;

    if (!confirm('Delete this message?')) return;

    chatSocketClient.deleteMessage(messageId, (response: { error?: string }) => {
      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-150 flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{groupName}</CardTitle>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.sender._id === currentUserId;
                const isDeleted = message.isDeleted;

                return (
                  <div
                    key={message._id}
                    className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={message.sender.avatar} />
                      <AvatarFallback>{message.sender.name[0]}</AvatarFallback>
                    </Avatar>

                    <div
                      className={`flex flex-col max-w-[70%] ${
                        isOwnMessage ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {isOwnMessage ? 'You' : message.sender.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.createdAt).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>

                      <div
                        className={`group relative px-4 py-2 rounded-lg ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        } ${isDeleted ? 'opacity-50 italic' : ''}`}
                      >
                        {replyingTo && message._id === replyingTo._id && (
                          <div className="text-xs opacity-70 mb-1 pb-1 border-b border-current">
                            Replying to this message
                          </div>
                        )}
                        
                        <p className="text-sm whitespace-pre-wrap wrap-break-word">
                          {message.content}
                        </p>

                        {message.isEdited && !isDeleted && (
                          <span className="text-xs opacity-70 ml-2">(edited)</span>
                        )}

                        {/* Message actions */}
                        {!isDeleted && isOwnMessage && (
                          <div className="absolute -top-2 right-0 hidden group-hover:flex gap-1 bg-background border rounded-md shadow-sm">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditingMessage(message);
                                setNewMessage(message.content);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDeleteMessage(message._id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {!isDeleted && !isOwnMessage && (
                          <div className="absolute -top-2 left-0 hidden group-hover:flex gap-1 bg-background border rounded-md shadow-sm">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setReplyingTo(message)}
                            >
                              <Reply className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="text-xs text-muted-foreground italic mt-2">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'}{' '}
              typing...
            </div>
          )}
        </ScrollArea>

        {/* Reply/Edit indicator */}
        {(replyingTo || editingMessage) && (
          <div className="px-4 py-2 bg-muted border-t flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">
                {editingMessage ? 'Editing message' : `Replying to ${replyingTo?.sender.name}`}
              </span>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                {editingMessage?.content || replyingTo?.content}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReplyingTo(null);
                setEditingMessage(null);
                setNewMessage('');
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" disabled>
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" disabled>
              <Smile className="w-4 h-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder={
                editingMessage
                  ? 'Edit your message...'
                  : 'Type a message...'
              }
              className="flex-1"
              disabled={!isConnected}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
