'use client';


import React, { useState } from 'react';
import { Card, Button, Badge, Input } from '../components/UIElements';
import { ICONS } from '../constants';

const StudyBoardView: React.FC = () => {
  const [activeTool, setActiveTool] = useState('pointer');

  const tools = [
    { id: 'pointer', icon: ICONS.Pointer, label: 'Select' },
    { id: 'draw', icon: ICONS.StudyBoard, label: 'Sketch' },
    { id: 'text', icon: ICONS.Type, label: 'Text' },
    { id: 'sticky', icon: ICONS.StickyNote, label: 'Sticker' },
    { id: 'image', icon: ICONS.Image, label: 'Drop Image' },
  ];

  return (
    <div className="h-full flex flex-col relative bg-slate-50 overflow-hidden -m-4 md:-m-8">
      {/* Board Header - Bubbly Style */}
      <div className="bg-white/80 backdrop-blur-md border-b-2 border-slate-100 px-8 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-5">
          <Button variant="secondary" size="icon" className="rounded-2xl h-10 w-10 border-b-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
              Advanced Calculus Lab
              <div className="flex items-center bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                Live Session
              </div>
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Sarah, Tom, and 3 others are studying here</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3 mr-4">
            {[1, 2, 3].map(i => (
              <img key={i} src={`https://picsum.photos/seed/${i+10}/50/50`} className="w-10 h-10 rounded-2xl border-4 border-white shadow-md" />
            ))}
            <div className="w-10 h-10 rounded-2xl border-4 border-white bg-indigo-500 text-[11px] font-black text-white flex items-center justify-center shadow-md">+5</div>
          </div>
          <Button variant="outline" className="gap-2 px-6">
            <ICONS.Share size={18} /> Invite
          </Button>
          <Button variant="primary" className="px-8 shadow-lg shadow-indigo-200">Save</Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Cartoon Toolbar */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 p-2 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-2xl z-30">
          {tools.map(tool => {
            const ToolIcon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`p-4 rounded-[1.8rem] transition-all relative group bouncy-hover border-b-4 ${
                  isActive 
                  ? 'bg-indigo-500 text-white border-indigo-700 shadow-lg' 
                  : 'text-slate-400 border-transparent hover:bg-indigo-50 hover:text-indigo-500'
                }`}
              >
                <ToolIcon size={24} strokeWidth={isActive ? 3 : 2} />
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 text-white text-[11px] font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                  {tool.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Canvas Surface - Playground */}
        <div className="flex-1 whiteboard-grid bg-white relative overflow-auto cursor-crosshair">
          <div className="min-w-[2400px] min-h-[2400px] relative p-20">
            {/* Playful Stickers / Notes */}
            <div className="absolute top-40 left-80 rotate-3 p-8 bg-amber-100 border-4 border-amber-200 shadow-xl rounded-[2rem] w-64 h-64 flex flex-col hover:scale-105 transition-transform">
               <div className="w-10 h-10 bg-amber-400 rounded-full absolute -top-5 -left-5 flex items-center justify-center text-white border-4 border-white shadow-md">
                 <ICONS.StickyNote size={20} />
               </div>
              <p className="text-amber-900 text-lg font-black leading-tight mb-4 italic">Check the derivative formula!</p>
              <p className="mt-auto text-xs text-amber-700 font-black uppercase tracking-widest">Jason • 2m ago</p>
            </div>

            <div className="absolute top-[500px] left-[400px] -rotate-2 p-1 bg-white border-4 border-indigo-100 rounded-[2rem] shadow-2xl overflow-hidden hover:scale-105 transition-transform cursor-move">
               <div className="bg-indigo-500 text-white px-4 py-2 font-black text-xs flex justify-between items-center rounded-t-[1.5rem]">
                 <span>Lecture_A1.pdf</span>
                 <ICONS.Plus size={14} />
               </div>
               <div className="p-8 w-[400px] h-[300px] bg-slate-50 flex flex-col gap-4">
                  <div className="h-6 bg-slate-200 w-3/4 rounded-full" />
                  <div className="h-6 bg-slate-200 w-full rounded-full" />
                  <div className="h-40 bg-indigo-100 rounded-3xl mt-4 flex items-center justify-center text-indigo-300 font-black text-2xl border-4 border-dashed border-indigo-200">
                    DIAGRAM
                  </div>
               </div>
            </div>

            {/* Bubbly Cursors */}
            <div className="absolute top-[600px] left-[900px] flex flex-col items-center">
              <ICONS.Pointer size={24} className="text-rose-500 drop-shadow-lg" fill="currentColor" />
              <div className="bg-rose-500 text-white text-xs px-3 py-1 rounded-full font-black shadow-lg shadow-rose-200 -mt-2">Sarah</div>
            </div>
          </div>
        </div>

        {/* AI Guide Panel */}
        <div className="w-96 bg-white border-l-2 border-slate-100 flex flex-col z-20">
          <div className="p-6 border-b-2 border-slate-50 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800">Study Buddy</h3>
            <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
              <ICONS.Settings size={20} />
            </div>
          </div>
          
          <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            {/* Mascot Tip */}
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-100 relative">
               <div className="absolute -top-4 -right-2 bg-amber-400 w-12 h-12 rounded-full border-4 border-white flex items-center justify-center text-2xl shadow-lg">🤖</div>
               <p className="text-sm font-bold leading-relaxed">
                 "Hey Sarah! I noticed you spent 15 minutes on this problem. Want a quick hint about the Power Rule?"
               </p>
               <Button variant="warning" size="sm" className="mt-4 w-full border-b-2">Yes, help me!</Button>
            </div>

            {/* Chat Messages */}
            <div className="space-y-4">
              <div className="flex gap-3">
                <img src="https://picsum.photos/seed/tom/50/50" className="w-8 h-8 rounded-xl shrink-0" alt="Tom" />
                <div className="bg-slate-100 rounded-[1.5rem] rounded-tl-none p-4 text-sm font-medium text-slate-700">
                  Does anyone get the graph?
                </div>
              </div>
              <div className="flex gap-3 flex-row-reverse">
                 <div className="bg-indigo-500 rounded-[1.5rem] rounded-tr-none p-4 text-sm font-medium text-white shadow-md">
                  Check the stickers! Tom added a hint.
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t-2 border-slate-100">
             <div className="relative">
                <Input placeholder="Type a message..." className="rounded-3xl pr-14 py-4" />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-500 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-200 press-effect">
                   <ICONS.Share size={18} />
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyBoardView;

