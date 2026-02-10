'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge, Input } from '../components/UIElements';
import { ICONS } from '../constants';
import { useAIChat, useSummarize, useGenerateQA, useGenerateMindMap, useAIHealth } from '@/hooks/useAI';
import { useAuthStore } from '@/lib/stores/auth.store';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

const StudyBuddy: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: '1', title: 'Calculus Derivatives Help', lastMessage: 'The chain rule is...', timestamp: '2m ago' },
    { id: '2', title: 'History Essay Outline', lastMessage: 'Great start on the intro!', timestamp: '1h ago' },
    { id: '3', title: 'Python Loop Logic', lastMessage: 'Let’s try a while loop.', timestamp: 'Yesterday' },
  ]);

  const [activeSessionId, setActiveSessionId] = useState('1');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'm1', sender: 'ai', text: "Hey Sarah! I'm your Study Buddy. What are we tackling today? 🚀", timestamp: '10:00 AM' },
    { id: 'm2', sender: 'user', text: "I'm struggling with the chain rule in my Calculus assignment.", timestamp: '10:01 AM' },
    { id: 'm3', sender: 'ai', text: "No worries! The chain rule is just about taking the derivative of the 'outside' function and multiplying it by the derivative of the 'inside' function. Want an example? 🧪", timestamp: '10:02 AM' },
  ]);

  const [inputText, setInputText] = useState('');

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newMessage]);
    setInputText('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "Ooh, that's a great question! Let me think for a second... 🤔 Okay, so here is the best way to look at it!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 -m-4 md:-m-8 bg-slate-50 overflow-hidden">
      {/* Session Management Sidebar */}
      <div className="w-full md:w-80 bg-white border-r-2 border-slate-100 flex flex-col h-full">
        <div className="p-6 border-b-2 border-slate-50">
          <Button variant="primary" className="w-full gap-2 rounded-2xl py-4 shadow-lg shadow-indigo-100">
            <ICONS.Plus size={18} strokeWidth={3} />
            New Session
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 px-2">Recent Chats</p>
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`w-full text-left p-4 rounded-2xl transition-all bouncy-hover group ${
                activeSessionId === session.id 
                  ? 'bg-indigo-50 border-2 border-indigo-200 shadow-sm' 
                  : 'hover:bg-slate-50 border-2 border-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className={`text-sm font-black truncate flex-1 ${activeSessionId === session.id ? 'text-indigo-600' : 'text-slate-800'}`}>
                  {session.title}
                </h4>
                <span className="text-[10px] text-slate-400 font-bold ml-2 shrink-0">{session.timestamp}</span>
              </div>
              <p className="text-xs text-slate-400 truncate font-medium">
                {session.lastMessage}
              </p>
            </button>
          ))}
        </div>

        <div className="p-4 border-t-2 border-slate-50">
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-none p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md">
                <ICONS.Sparkles size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-indigo-600">Upgrade to Pro</p>
                <p className="text-[10px] font-bold text-indigo-400 uppercase">Unlimited AI Sessions</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative">
        {/* Chat Header */}
        <div className="p-6 border-b-2 border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-2xl shadow-lg border-4 border-white">
                🤖
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 leading-none">Study Buddy</h3>
              <p className="text-xs text-emerald-500 font-bold uppercase tracking-tight mt-1">Online • Brainy</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-xl"><ICONS.Search size={20}/></Button>
            <Button variant="ghost" size="icon" className="rounded-xl"><ICONS.Menu size={20}/></Button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-slate-50/30">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`flex gap-4 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className="shrink-0 mt-1">
                {message.sender === 'ai' ? (
                  <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-xl shadow-md border-2 border-white">🤖</div>
                ) : (
                  <img src="https://picsum.photos/seed/sarah/50/50" className="w-10 h-10 rounded-xl border-2 border-white shadow-md" alt="Sarah" />
                )}
              </div>
              <div className={`max-w-[75%] space-y-1 ${message.sender === 'user' ? 'items-end' : ''}`}>
                <div className={`p-5 rounded-[2rem] shadow-sm font-medium text-sm leading-relaxed border-2 ${
                  message.sender === 'ai' 
                    ? 'bg-white text-slate-800 rounded-tl-none border-slate-100' 
                    : 'bg-indigo-500 text-white rounded-tr-none border-indigo-600'
                }`}>
                  {message.text}
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase px-2">{message.timestamp}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t-2 border-slate-50">
          <div className="max-w-4xl mx-auto relative">
            <Input 
              placeholder="Ask Study Buddy anything..." 
              className="rounded-[2.5rem] py-5 px-8 text-base border-2 focus:ring-8 shadow-inner bg-slate-50"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
              <button className="p-2.5 text-slate-400 hover:text-indigo-500 transition-colors bouncy-hover">
                <ICONS.Plus size={22} strokeWidth={3} />
              </button>
              <Button 
                onClick={handleSendMessage}
                className="w-12 h-12 rounded-full p-0 flex items-center justify-center shadow-indigo-200"
              >
                <ICONS.Share size={20} className="rotate-[-45deg] mr-0.5 mt-0.5" strokeWidth={3} />
              </Button>
            </div>
          </div>
          <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-4">
            Study Buddy uses AI to help you learn faster. Always double check facts!
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudyBuddy;

