'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle } from 'lucide-react';
import chatService, { Message, Conversation } from '@/lib/services/chat.service';
import chatSocketClient from '@/lib/chatSocket';
import { useAuthStore } from '@/lib/stores/auth.store';
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
        <p className="text-sm text-slate-400">Please log in to use chat</p>
      </div>
    );
  }

  useEffect(() => {
    if (user) {
      chatSocketClient.connect(user.id, user.email);
      loadConversations();

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
    const currentConversation = selectedConversationRef.current;

    if (!currentConversation) {
      loadConversations();
      return;
    }

    const isRelevant =
      currentConversation.friend &&
      (message.sender?.id === user?.id || message.sender?.id === currentConversation.friend.id);

    if (isRelevant) {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
      setTimeout(scrollToBottom, 100);

      if (message.sender?.id !== user?.id) {
        chatSocketClient.markAsRead([message._id]);
      }
    }

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

    const userIds = [user.id, selectedConversation.friend.id].sort();
    const conversationId = `${userIds[0]}:${userIds[1]}`;

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

    const userIds = [user.id, selectedConversation.friend.id].sort();
    const conversationId = `${userIds[0]}:${userIds[1]}`;

    if (!isTyping) {
      setIsTyping(true);
      chatSocketClient.startTyping('direct', conversationId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      chatSocketClient.stopTyping('direct', conversationId);
    }, 1000);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      {/* ── Left: Conversations ── */}
      <div className="w-72 flex-shrink-0 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Direct Messages</h3>
        </div>
        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No conversations yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Add friends to start chatting!</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.friend?.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                    selectedConversation?.friend?.id === conv.friend?.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={conv.friend?.avatar} />
                    <AvatarFallback className="text-sm">{conv.friend?.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">{conv.friend?.name}</p>
                      {conv.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 ml-1.5">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs text-slate-400 truncate">{conv.lastMessage.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Right: Chat Area ── */}
      <div className="flex-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-w-0">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-shrink-0">
              <Avatar className="w-8 h-8">
                <AvatarImage src={selectedConversation.friend?.avatar} />
                <AvatarFallback className="text-sm">{selectedConversation.friend?.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedConversation.friend?.name}</p>
                <p className="text-xs text-slate-400">
                  {typingUser ? <span className="text-indigo-500 italic">{typingUser} is typing...</span> : 'Online'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3 pb-2">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full py-12 text-slate-400">
                      <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.sender.id === user?.id;
                      return (
                        <div
                          key={message._id}
                          className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isOwn && (
                            <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                              <AvatarImage src={message.sender.avatar} />
                              <AvatarFallback className="text-xs">{message.sender.name[0]}</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                            {!isOwn && (
                              <span className="text-[10px] font-medium text-slate-400 mb-0.5 px-1">
                                {message.sender.name}
                              </span>
                            )}
                            <div
                              className={`rounded-2xl px-3.5 py-2 text-sm ${
                                isOwn
                                  ? 'bg-indigo-500 text-white rounded-br-md'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md'
                              }`}
                            >
                              <p className="break-words whitespace-pre-wrap">{message.content}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {isOwn && (
                            <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
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
                  placeholder="Type a message..."
                  className="h-9 text-sm"
                />
                <Button
                  onClick={handleSendMessage}
                  size="sm"
                  disabled={!newMessage.trim()}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white h-9 px-3"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <h3 className="text-base font-semibold text-slate-600 dark:text-slate-400 mb-1">No Conversation Selected</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
