'use client';


import React, { useState } from 'react';
import { Card, Button, Badge, Input } from '../components/UIElements';
import { ICONS } from '../constants';

const Flashcard: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="relative w-full h-64 perspective-1000 cursor-pointer group"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front */}
        <div className="absolute inset-0 backface-hidden">
          <Card className="h-full flex flex-col items-center justify-center text-center border-b-8 border-indigo-600 shadow-xl p-8 bg-white group-hover:shadow-2xl transition-all">
            <Badge variant="indigo" className="absolute top-6 left-6">Question</Badge>
            <h4 className="text-xl font-black text-slate-800 leading-tight">{question}</h4>
            <p className="mt-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">Tap to flip 👆</p>
          </Card>
        </div>
        {/* Back */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <Card className="h-full flex flex-col items-center justify-center text-center border-b-8 border-emerald-500 shadow-xl p-8 bg-emerald-50 group-hover:shadow-2xl transition-all">
            <Badge variant="emerald" className="absolute top-6 left-6">Answer</Badge>
            <h4 className="text-lg font-bold text-slate-700 leading-relaxed">{answer}</h4>
            <p className="mt-8 text-[10px] font-black text-emerald-300 uppercase tracking-widest">Mastered! ✅</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

const VisualAidsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'flashcards' | 'mindmap' | 'concepts'>('flashcards');

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Visual Learning Aids</h2>
          <p className="text-slate-500 font-bold">Transform complex ideas into simple visual shapes.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-[2rem] border-2 border-slate-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('flashcards')}
            className={`px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all ${activeTab === 'flashcards' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-indigo-500'}`}
          >
            Flashcards
          </button>
          <button 
            onClick={() => setActiveTab('mindmap')}
            className={`px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all ${activeTab === 'mindmap' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-indigo-500'}`}
          >
            Mind Map
          </button>
          <button 
            onClick={() => setActiveTab('concepts')}
            className={`px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all ${activeTab === 'concepts' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-indigo-500'}`}
          >
            Concept Cards
          </button>
        </div>
      </div>

      {activeTab === 'flashcards' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black text-slate-800">Advanced Biology Set</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Shuffle</Button>
              <Button variant="primary" size="sm" className="gap-2"><ICONS.Plus size={16}/> Add Card</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Flashcard 
              question="What is the powerhouse of the cell?" 
              answer="The Mitochondria! It generates most of the cell's supply of ATP."
            />
            <Flashcard 
              question="Define Photosynthesis." 
              answer="The process by which green plants use sunlight to synthesize nutrients from CO2 and water."
            />
            <Flashcard 
              question="What are the base pairs in DNA?" 
              answer="Adenine (A) with Thymine (T), and Cytosine (C) with Guanine (G)."
            />
          </div>
        </div>
      )}

      {activeTab === 'mindmap' && (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black text-slate-800">Knowledge Network</h3>
            <Button variant="primary" size="sm" className="gap-2"><ICONS.Sparkles size={16}/> Auto-Generate</Button>
          </div>
          <div className="whiteboard-grid bg-white h-[600px] rounded-[3rem] border-4 border-slate-100 relative overflow-hidden flex items-center justify-center p-12 shadow-inner">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500 rounded-full flex items-center justify-center text-white text-center p-6 shadow-2xl border-8 border-white z-10">
              <span className="font-black text-2xl">Modern Physics</span>
            </div>
            
            {/* Placeholders for nodes */}
            <div className="absolute top-20 left-40 w-40 h-40 bg-rose-100 border-4 border-rose-200 rounded-[2rem] flex items-center justify-center text-rose-700 font-bold shadow-lg animate-bounce">
              Quantum Mech
            </div>
            <div className="absolute bottom-20 left-60 w-44 h-44 bg-amber-100 border-4 border-amber-200 rounded-[2rem] flex items-center justify-center text-amber-700 font-bold shadow-lg delay-100 animate-pulse">
              Relativity
            </div>
            <div className="absolute top-32 right-40 w-48 h-48 bg-emerald-100 border-4 border-emerald-200 rounded-[2rem] flex items-center justify-center text-emerald-700 font-bold shadow-lg delay-300 animate-pulse">
              Thermodynamics
            </div>
            
            {/* Lines simulation */}
            <svg className="absolute inset-0 pointer-events-none opacity-20">
              <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="#818cf8" strokeWidth="8" strokeLinecap="round" strokeDasharray="12 12" />
              <line x1="50%" y1="50%" x2="75%" y2="30%" stroke="#818cf8" strokeWidth="8" strokeLinecap="round" strokeDasharray="12 12" />
              <line x1="50%" y1="50%" x2="35%" y2="80%" stroke="#818cf8" strokeWidth="8" strokeLinecap="round" strokeDasharray="12 12" />
            </svg>

            <div className="absolute bottom-8 right-8 flex gap-2">
               <Button variant="secondary" size="icon"><ICONS.Pointer size={20}/></Button>
               <Button variant="secondary" size="icon"><ICONS.Plus size={20}/></Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'concepts' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black text-slate-800">Visual Encyclopedia</h3>
            <Input placeholder="Filter by subject..." className="max-w-xs" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card hoverable className="p-0 border-b-8 border-indigo-100">
               <div className="h-48 bg-indigo-500 rounded-t-[1.8rem] flex items-center justify-center text-white overflow-hidden relative">
                  <div className="absolute inset-0 opacity-10 whiteboard-grid" />
                  {/* Fixed: Changed ICONS.BookOpen to ICONS.Book */}
                  <ICONS.Book size={64} strokeWidth={1} />
               </div>
               <div className="p-8 space-y-4">
                  <Badge variant="indigo">Engineering</Badge>
                  <h4 className="text-2xl font-black text-slate-800">Bernoulli's Principle</h4>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    States that an increase in the speed of a fluid occurs simultaneously with a decrease in static pressure or a decrease in the fluid's potential energy.
                  </p>
                  <Button variant="outline" className="w-full">View Full Diagram</Button>
               </div>
            </Card>

            <Card hoverable className="p-0 border-b-8 border-amber-100">
               <div className="h-48 bg-amber-400 rounded-t-[1.8rem] flex items-center justify-center text-white overflow-hidden relative">
                  <div className="absolute inset-0 opacity-10 whiteboard-grid" />
                  <ICONS.Sparkles size={64} strokeWidth={1} />
               </div>
               <div className="p-8 space-y-4">
                  <Badge variant="amber">Astrophysics</Badge>
                  <h4 className="text-2xl font-black text-slate-800">Event Horizon</h4>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    The boundary surrounding a black hole beyond which no light or other radiation can escape. The "point of no return" for all matter.
                  </p>
                  <Button variant="outline" className="w-full">Open Simulation</Button>
               </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualAidsView;

