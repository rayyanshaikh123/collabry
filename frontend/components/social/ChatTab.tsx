'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle } from 'lucide-react';
import chatService, { Message, Conversation } from '@/src/services/chat.service';
import chatSocketClient from '@/src/lib/chatSocket';
import { useAuthStore } from '@/src/stores/auth.store';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ChatTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const { user } = useAuthStore();
  const { toast } = useToast();

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Early return if no user
  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Please log in to use chat</p>
      </div>
    );
  }

  useEffect(() => {
    if (user) {
      // Connect chat socket
      chatSocketClient.connect(user.id, user.email);
      loadConversations();

      // Listen for new messages
      chatSocketClient.onMessageNew(handleNewMessage);
      chatSocketClient.onUserTyping(handleUserTyping);
      chatSocketClient.onUserStoppedTyping(handleUserStoppedTyping);

      return () => {
        chatSocketClient.offMessageNew();
        chatSocketClient.offUserTyping();
        chatSocketClient.offUserStoppedTyping();
      };
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation && selectedConversation.friend) {
      loadMessages();
      
      // Create consistent room name for direct messages by sorting IDs
      const userIds = [user.id, selectedConversation.friend.id].sort();
      const conversationId = `${userIds[0]}:${userIds[1]}`;
      chatSocketClient.joinConversation('direct', conversationId);
    }
  }, [selectedConversation, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const loadMessages = async () => {
    if (!selectedConversation || !selectedConversation.friend) return;

    try {
      const data = await chatService.getMessages({
        type: 'direct',
        recipientId: selectedConversation.friend.id,
        limit: 50,
      });
      setMessages(data);

      // Mark messages as read
      const unreadIds = data
        .filter((m) => m.sender.id !== user?.id && !m.readBy.some((r) => r.user === user?.id))
        .map((m) => m._id);

      if (unreadIds.length > 0) {
        chatSocketClient.markAsRead(unreadIds);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleNewMessage = (message: Message) => {
    // Use ref to get current value instead of stale closure
    const currentConversation = selectedConversationRef.current;

    if (!currentConversation) {
      loadConversations();
      return;
    }

    // Check if message is for current direct conversation
    const isRelevant =
      currentConversation.friend &&
      (message.sender?.id === user?.id || message.sender?.id === currentConversation.friend.id);

    if (isRelevant) {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m._id === message._id)) {
          return prev;
        }
        return [...prev, message];
      });

      // Scroll after update
      setTimeout(scrollToBottom, 100);

      // Mark as read if not from current user
      if (message.sender?.id !== user?.id) {
        chatSocketClient.markAsRead([message._id]);
      }
    }

    // Update conversations list
    loadConversations();
  };

  const handleUserTyping = (data: { userId: string; userEmail: string }) => {
    if (selectedConversation?.friend?.id === data.userId) {
      setTypingUser(selectedConversation.friend.name);
      setTimeout(() => setTypingUser(null), 3000);
    }
  };

  const handleUserStoppedTyping = (data: { userId: string }) => {
    if (selectedConversation?.friend?.id === data.userId) {
      setTypingUser(null);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !selectedConversation.friend) return;

    const content = newMessage.trim();
    setNewMessage('');

    // Create consistent room ID
    const userIds = [user.id, selectedConversation.friend.id].sort();
    const conversationId = `${userIds[0]}:${userIds[1]}`;

    // Stop typing
    chatSocketClient.stopTyping('direct', conversationId);

    try {
      chatSocketClient.sendMessage(
        {
          conversationType: 'direct',
          content,
          recipientId: selectedConversation.friend.id,
        },
        (response) => {
          if (response.error) {
            toast({ title: 'Error', description: response.error, variant: 'destructive' });
          }
        }
      );
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleTyping = () => {
    if (!selectedConversation || !selectedConversation.friend) return;

    // Create consistent room ID
    const userIds = [user.id, selectedConversation.friend.id].sort();
    const conversationId = `${userIds[0]}:${userIds[1]}`;

    if (!isTyping) {
      setIsTyping(true);
      chatSocketClient.startTyping('direct', conversationId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      chatSocketClient.stopTyping('direct', conversationId);
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] bg-transparent">
      <div className="md:col-span-1">
        <Card className="h-full rounded-2xl bg-transparent border-2 border-slate-200/30 dark:border-slate-700/30 shadow-lg">
          <CardHeader>
            <CardTitle>Direct Messages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Add friends to start chatting!</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.friend?.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 border-b cursor-pointer transition-colors ${
                      selectedConversation?.friend?.id === conv.friend?.id
                        ? 'bg-primary/10'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={conv.friend?.avatar} />
                        <AvatarFallback>{conv.friend?.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{conv.friend?.name}</p>
                          {conv.unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card className="h-full flex flex-col rounded-2xl bg-transparent border-2 border-slate-200/30 dark:border-slate-700/30 shadow-lg">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedConversation.friend?.avatar} />
                    <AvatarFallback>{selectedConversation.friend?.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{selectedConversation.friend?.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {typingUser ? `${typingUser} is typing...` : 'Online'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4 pb-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isOwn = message.sender.id === user?.id;
                        return (
                          <div
                            key={message._id}
                            className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                          >
                            {!isOwn && (
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src={message.sender.avatar} />
                                <AvatarFallback>{message.sender.name[0]}</AvatarFallback>
                              </Avatar>
                            )}
                            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                              {!isOwn && (
                                <span className="text-xs font-medium text-muted-foreground mb-1 px-2">
                                  {message.sender.name}
                                </span>
                              )}
                              <div
                                className={`rounded-2xl px-4 py-2 shadow-sm ${
                                  isOwn
                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                    : 'bg-muted text-foreground rounded-bl-sm'
                                }`}
                              >
                                <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                              </div>
                              <span className="text-xs text-muted-foreground mt-1 px-2">
                                {new Date(message.createdAt).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            {isOwn && (
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.name[0]}</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>
              
              <div className="p-4 border-t bg-transparent flex-shrink-0">
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
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    size="icon"
                    disabled={!newMessage.trim()}
                    className="flex-shrink-0 bg-emerald-400 hover:bg-emerald-500 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Conversation Selected</h3>
                <p>Select a conversation to start chatting</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
