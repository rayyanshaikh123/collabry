'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ICONS } from '@/constants';
import { Loader2, ExternalLink } from 'lucide-react';

interface ApiKeyCardProps {
  provider: 'openai' | 'groq' | 'gemini';
  keyData?: {
    isActive: boolean;
    isValid: boolean;
    lastValidated?: string;
    addedAt?: string;
  };
  isActive: boolean;
  onAdd: (provider: string, apiKey: string) => Promise<void>;
  onActivate: (provider: string) => Promise<void>;
  onDelete: (provider: string) => Promise<void>;
  onValidate: (provider: string) => Promise<void>;
}

const PROVIDER_INFO = {
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    docLink: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...'
  },
  groq: {
    name: 'Groq',
    icon: '⚡',
    docLink: 'https://console.groq.com/keys',
    placeholder: 'gsk_...'
  },
  gemini: {
    name: 'Google Gemini',
    icon: '✨',
    docLink: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIza...'
  }
};

export default function ApiKeyCard({ 
  provider, 
  keyData, 
  isActive, 
  onAdd, 
  onActivate, 
  onDelete, 
  onValidate 
}: ApiKeyCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const info = PROVIDER_INFO[provider];
  const hasKey = !!keyData;

  const handleAdd = async () => {
    if (!apiKey.trim()) return;
    setLoading(true);
    try {
      await onAdd(provider, apiKey);
      setApiKey('');
      setIsAdding(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{info.icon}</div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200">{info.name}</h4>
            <a
              href={info.docLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Get API Key <ExternalLink size={10} />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasKey && (
            <>
              <Badge variant={keyData.isValid ? 'default' : 'destructive'}>
                {keyData.isValid ? <ICONS.Check size={12} className="mr-1" /> : <ICONS.X size={12} className="mr-1" />}
                {keyData.isValid ? 'Valid' : 'Invalid'}
              </Badge>
              {isActive && (
                <Badge className="bg-emerald-500 text-white">
                  Active
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {isAdding ? (
        <div className="space-y-3">
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder={info.placeholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showKey ? <ICONS.EyeOff size={16} /> : <ICONS.Eye size={16} />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <ICONS.Check size={14} className="mr-2" />}
              Save Key
            </Button>
            <Button variant="ghost" onClick={() => setIsAdding(false)} className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancel
            </Button>
          </div>
        </div>
      ) : hasKey ? (
        <div className="flex gap-2">
          <Button
            onClick={() => onActivate(provider)}
            disabled={loading}
            className={`flex-1 ${isActive ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
          >
            {isActive ? 'Active' : 'Activate'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onValidate(provider)}
            disabled={loading}
            className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Validate'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onDelete(provider)}
            disabled={loading}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20"
          >
            Delete
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setIsAdding(true)} className="w-full text-white dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ICONS.Key size={14} className="mr-2" />
          Add API Key
        </Button>
      )}

      {hasKey && keyData.lastValidated && (
        <p className="text-xs text-slate-400 mt-2">
          Last validated: {new Date(keyData.lastValidated).toLocaleString()}
        </p>
      )}
    </Card>
  );
}
