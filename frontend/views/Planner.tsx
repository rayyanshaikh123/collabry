'use client';


import React from 'react';
import { Card, Button, Badge } from '../components/UIElements';
import { ICONS, MOCK_TASKS } from '../constants';

const Planner: React.FC = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dates = Array.from({ length: 35 }, (_, i) => i - 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Your Schedule</h2>
          <p className="text-slate-500 text-sm">Organize your sessions and set deadlines.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">Month</Button>
          <Button variant="ghost">Week</Button>
          <Button variant="primary" className="gap-2">
            <ICONS.Plus size={16} /> New Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card noPadding>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">October 2024</h3>
              <div className="flex gap-1">
                <button className="p-1.5 hover:bg-slate-100 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                <button className="p-1.5 hover:bg-slate-100 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </div>
            </div>
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
              {days.map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[600px]">
              {dates.map((date, i) => (
                <div key={i} className={`border-r border-b border-slate-100 p-2 min-h-[100px] transition-colors hover:bg-slate-50/50 group ${date < 1 || date > 31 ? 'bg-slate-50/20 text-slate-300' : 'text-slate-600'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${date === 14 ? 'bg-indigo-600 text-white' : ''}`}>
                      {date < 1 ? 30 + date : date > 31 ? date - 31 : date}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-indigo-600 transition-opacity">
                      <ICONS.Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-bold text-slate-800 mb-4">Upcoming Deadlines</h3>
            <div className="space-y-4">
              {MOCK_TASKS.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 dark:text-slate-500">No tasks yet. Add your first task to get started!</p>
                </div>
              ) : MOCK_TASKS.filter(t => !t.completed).map(task => (
                <div key={task.id} className="group p-3 border border-slate-100 rounded-xl hover:border-indigo-100 hover:bg-indigo-50/20 transition-all cursor-pointer">
                  <Badge variant={task.category === 'Exam' ? 'rose' : 'indigo'} className="mb-2">
                    {task.category}
                  </Badge>
                  <h4 className="text-sm font-bold text-slate-800">{task.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <ICONS.Focus size={12} /> {task.dueDate}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Planner;

