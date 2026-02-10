/**
 * AI Chat Example Component
 * Example of using AI Engine directly from frontend
 */

'use client';

import React, { useState } from 'react';
import { useAIChat, useAIHealth } from '@/hooks/useAI';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function AIChatExample() {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<any[]>([]);
  const { user } = useAuthStore();
  const { mutate: sendMessage, isPending } = useAIChat();
  const { data: aiHealth } = useAIHealth();

  const handleSendMessage = () => {
    if (!message.trim()) return;

    // Add user message to conversation
    setConversation((prev) => [...prev, { role: 'user', content: message }]);

    sendMessage(
      { message },
      {
        onSuccess: (response: any) => {
          // Add AI response to conversation
          setConversation((prev) => [
            ...prev,
            { role: 'assistant', content: response.response || response.message },
          ]);
          setMessage('');
        },
        onError: (error: any) => {
          console.error('Chat error:', error);
          setConversation((prev) => [
            ...prev,
            { role: 'error', content: error.message },
          ]);
        },
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* AI Health Status */}
      <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-between border-2 border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="font-bold text-slate-700 dark:text-slate-200">AI Engine Status</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {aiHealth?.status === 'healthy' ? '✅ Connected' : '❌ Disconnected'}
          </p>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          Endpoint: {process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000'}
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border-2 border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-4">
          <h2 className="text-xl font-black text-white">AI Study Assistant</h2>
          <p className="text-indigo-100 text-sm">
            Connected directly to AI Engine (FastAPI)
          </p>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
          {conversation.length === 0 ? (
            <div className="text-center text-slate-400 dark:text-slate-500 mt-20">
              <p className="text-lg font-semibold">Start a conversation!</p>
              <p className="text-sm">Ask me anything about your studies</p>
            </div>
          ) : (
            conversation.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md p-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-white'
                      : msg.role === 'error'
                      ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                      : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}

          {isPending && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-2xl">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t-2 border-slate-100 dark:border-slate-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything..."
              disabled={isPending || !user}
              className="flex-1 px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-400 dark:focus:border-indigo-600 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendMessage}
              disabled={isPending || !message.trim() || !user}
              className="px-6 py-3 bg-indigo-500 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
          {!user && (
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-2">Please log in to use AI features</p>
          )}
        </div>
      </div>

      {/* Additional AI Features */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <button className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all">
          <div className="text-2xl mb-2">📝</div>
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Summarize</div>
        </button>
        <button className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all">
          <div className="text-2xl mb-2">❓</div>
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Generate Q&A</div>
        </button>
        <button className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all">
          <div className="text-2xl mb-2">🧠</div>
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Mind Map</div>
        </button>
        <button className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all">
          <div className="text-2xl mb-2">📚</div>
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Ingest Doc</div>
        </button>
      </div>
    </div>
  );
}
