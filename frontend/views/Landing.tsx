'use client';


import React, { useState } from 'react';
import { Button } from '../components/UIElements';
import { ICONS } from '../constants';
import { motion } from 'framer-motion';
import { Highlighter } from '../components/ui/highlighter';
import { ProgressiveBlur } from '../components/ui/progressive-blur';

const LandingPage: React.FC<{ onGetStarted: () => void; onCycleTheme?: () => void }> = ({ onGetStarted, onCycleTheme }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLogoClick = () => {
    if (onCycleTheme) {
      setIsAnimating(true);
      onCycleTheme();
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden flex flex-col relative">
      {/* Progressive blur effects */}
      <ProgressiveBlur position="bottom" height="15vh" className="fixed bottom-0 left-0 right-0 z-50" />
      
      {/* Navbar */}
      <nav className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full relative z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleLogoClick}
            className={`w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg border-b-4 border-indigo-800 transition-all active:translate-y-1 active:border-b-0 ${isAnimating ? 'animate-logo-pop' : ''}`}
            title="Click to cycle theme!"
          >
            <span className="text-white font-black text-2xl font-display">C</span>
          </button>
          <span className="text-2xl font-black text-slate-800 tracking-tight font-display">Collabry</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <button className="text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">Features</button>
          <button className="text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">Community</button>
          <button className="text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest relative inline-block group">
            <span className="relative z-10">Pricing</span>
            <div className="absolute inset-0 bg-yellow-300 opacity-0 group-hover:opacity-40 transition-opacity transform -skew-x-3 -rotate-1" style={{ top: '40%', height: '50%' }}></div>
          </button>
          <Button variant="primary" size="sm" onClick={onGetStarted}>Sign In</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-12 relative">
        <div className="max-w-4xl space-y-6 relative z-10">
          <div className="inline-block px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-[0.2em] border-2 border-indigo-100 mb-4 animate-bounce">
            Learning Reimagined 🚀
          </div>
          <h1 className="text-5xl md:text-8xl font-black text-slate-800 leading-[1.1] tracking-tight font-display">
            Study Together, <br/> 
            <Highlighter color="#c7d2fe" action="highlight" strokeWidth={2} animationDuration={1200} isView={true}>
              <span className="text-indigo-600">Smarter & Better.</span>
            </Highlighter>
          </h1>
          <p className="text-lg md:text-2xl text-slate-500 font-bold max-w-2xl mx-auto leading-relaxed">
            The all-in-one <Highlighter color="#fef08a" action="underline" strokeWidth={2} animationDuration={1200} isView={true}><span className="text-slate-700">AI study buddy</span></Highlighter> & collaborative workspace for students who want to crush their goals while having fun.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <Button size="lg" className="px-12 py-5 text-xl shadow-2xl shadow-indigo-200" onClick={onGetStarted}>
            Start Your Journey
          </Button>
          <Button variant="secondary" size="lg" className="px-12 py-5 text-xl border-2 border-slate-100">
            See it in Action
          </Button>
        </div>

        {/* Feature Teasers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mt-20">
          {[
            { title: 'AI Study Buddy', desc: 'Your 24/7 personal tutor powered by Gemini.', icon: '🤖', color: 'bg-amber-100 text-amber-700' },
            { title: 'Live Boards', desc: 'Real-time collaborative drawing and brainstorming.', icon: '🎨', color: 'bg-indigo-100 text-indigo-700' },
            { title: 'Focus Streak', desc: 'Stay productive with gamified focus sessions.', icon: '🔥', color: 'bg-rose-100 text-rose-700' },
          ].map((f, i) => (
            <motion.div 
              key={i} 
              className="p-8 bg-white border-2 border-slate-50 rounded-[2.5rem] shadow-xl hover:-translate-y-2 transition-all group"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className={`w-16 h-16 ${f.color} rounded-[1.5rem] flex items-center justify-center text-3xl mb-6 shadow-md border-b-4 border-slate-200 group-hover:border-indigo-300`}>
                {f.icon}
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{f.title}</h3>
              <p className="text-slate-500 font-bold text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* How It Works Section */}
      <section className="py-32 px-6 bg-gradient-to-br from-indigo-50 to-rose-50 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-200 rounded-full blur-3xl opacity-20" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="inline-block px-4 py-2 bg-white rounded-full text-xs font-black uppercase tracking-[0.2em] border-2 border-indigo-100 mb-6">
              Simple Process ✨
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-slate-800 mb-6 font-display">
              How <Highlighter color="#fbbf24" action="highlight" strokeWidth={3} animationDuration={1200} isView={true}><span>Collabry Works</span></Highlighter>
            </h2>
            <p className="text-xl text-slate-600 font-bold max-w-2xl mx-auto">
              Get started in minutes and transform your study experience
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            {/* Diary/Notebook container */}
            <div className="relative">
              {/* Full spiral binding */}
              <div className="absolute left-8 top-0 bottom-0 w-12 flex flex-col justify-between py-6 z-10">
                {Array(15).fill(0).map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-4 border-slate-400 bg-slate-100 shadow-inner"></div>
                ))}
              </div>

              {/* Notebook pages */}
              <div className="ml-16 bg-amber-50 rounded-r-3xl shadow-2xl border-2 border-amber-200 relative overflow-hidden">
                {/* Ruled lines background */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 35px, #d97706 35px, #d97706 36px)',
                  backgroundSize: '100% 36px'
                }}></div>

                {/* Red margin line */}
                <div className="absolute left-16 top-0 bottom-0 w-1 bg-red-300 opacity-40"></div>

                {/* Content */}
                <div className="relative p-12 pl-24 space-y-8">
                  {/* Title with highlighter */}
                  <div className="mb-8">
                    <h3 className="text-4xl font-bold text-slate-800 mb-2 relative inline-block" style={{ fontFamily: 'Caveat, cursive' }}>
                      <span className="relative z-10">How to Get Started</span>
                      <div className="absolute inset-0 bg-yellow-300 opacity-30 transform -skew-x-3 -rotate-1" style={{ top: '40%', height: '50%' }}></div>
                    </h3>
                    <div className="w-32 h-1 bg-amber-400 rounded"></div>
                  </div>

                  {[
                    { 
                      step: '01', 
                      title: 'Sign Up', 
                      desc: 'Create your free account in seconds', 
                      icon: '👋', 
                      color: 'bg-violet-200 border-violet-400',
                      highlight: 'bg-violet-300'
                    },
                    { 
                      step: '02', 
                      title: 'Upload Materials', 
                      desc: 'Drop your notes, PDFs, or links', 
                      icon: '📚', 
                      color: 'bg-blue-200 border-blue-400',
                      highlight: 'bg-cyan-300'
                    },
                    { 
                      step: '03', 
                      title: 'Ask AI Anything', 
                      desc: 'Get instant explanations and summaries', 
                      icon: '🧠', 
                      color: 'bg-rose-200 border-rose-400',
                      highlight: 'bg-pink-300'
                    },
                    { 
                      step: '04', 
                      title: 'Collaborate', 
                      desc: 'Study with friends in real-time', 
                      icon: '🤝', 
                      color: 'bg-amber-200 border-amber-400',
                      highlight: 'bg-orange-300'
                    },
                  ].map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15, duration: 0.5 }}
                      viewport={{ once: true }}
                      className="relative"
                    >
                      {/* Step number badge */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-16 h-16 ${step.color} border-2 rounded-2xl flex items-center justify-center text-3xl shadow-md transform -rotate-2`}>
                          {step.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl font-bold text-indigo-600" style={{ fontFamily: 'Caveat, cursive' }}>
                              {step.step}.
                            </span>
                            <h4 className="text-2xl font-bold text-slate-800 relative inline-block" style={{ fontFamily: 'Caveat, cursive' }}>
                              <span className="relative z-10">{step.title}</span>
                              <div className={`absolute inset-0 ${step.highlight} opacity-30 transform -skew-x-2 rotate-1`} style={{ top: '45%', height: '45%' }}></div>
                            </h4>
                          </div>
                          <p className="text-lg text-slate-700 leading-relaxed" style={{ fontFamily: 'Caveat, cursive' }}>
                            {step.desc}
                          </p>
                        </div>
                      </div>

                      {/* Connector arrow (except for last item) */}
                      {i < 3 && (
                        <div className="flex items-center gap-2 ml-8 my-2">
                          <div className="w-0.5 h-6 bg-indigo-300"></div>
                          <span className="text-indigo-400 text-xl">↓</span>
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Success sticker with highlighter */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: 3 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    viewport={{ once: true }}
                    className="mt-12 p-6 bg-emerald-200 border-4 border-emerald-400 rounded-3xl shadow-xl transform rotate-1 relative"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">✨</div>
                      <div>
                        <div className="text-2xl font-bold text-emerald-800 mb-1 relative inline-block" style={{ fontFamily: 'Caveat, cursive' }}>
                          <span className="relative z-10">You're all set!</span>
                          <div className="absolute inset-0 bg-emerald-400 opacity-40 transform -skew-x-2" style={{ top: '40%', height: '50%' }}></div>
                        </div>
                        <div className="text-lg text-emerald-700" style={{ fontFamily: 'Caveat, cursive' }}>
                          Ready to start your study journey
                        </div>
                      </div>
                    </div>
                    {/* Corner fold effect */}
                    <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-300 transform rotate-45 translate-x-6 -translate-y-6 border-r-2 border-t-2 border-emerald-400"></div>
                  </motion.div>
                </div>

                {/* Page curl effect */}
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-amber-100 rounded-tl-full border-l-2 border-t-2 border-amber-300 shadow-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="inline-block px-4 py-2 bg-indigo-50 rounded-full text-xs font-black uppercase tracking-[0.2em] border-2 border-indigo-100 mb-6 text-indigo-600">
              Pricing Plans 💰
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-slate-800 mb-6 font-display">
              Choose Your <span className="text-amber-600">Perfect Plan</span>
            </h2>
            <p className="text-xl text-slate-600 font-bold max-w-2xl mx-auto">
              Start free and upgrade as you grow. No hidden fees, cancel anytime.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { 
                name: "Free",
                price: "$0",
                period: "forever",
                description: "Perfect for getting started",
                features: [
                  "AI Study Buddy (10 questions/day)",
                  "Basic document upload",
                  "1 collaborative board",
                  "Focus timer",
                  "Community access"
                ],
                buttonText: "Get Started",
                popular: false,
                gradient: "from-slate-50 to-slate-100",
                borderColor: "border-slate-200"
              },
              { 
                name: "Pro",
                price: "$9.99",
                period: "per month",
                description: "For serious students",
                features: [
                  "Unlimited AI questions",
                  "Advanced document analysis",
                  "Unlimited boards",
                  "Priority AI responses",
                  "Custom study plans",
                  "Export & share notes",
                  "Ad-free experience"
                ],
                buttonText: "Start Free Trial",
                popular: true,
                gradient: "from-indigo-50 to-purple-50",
                borderColor: "border-indigo-300"
              },
              { 
                name: "Team",
                price: "$24.99",
                period: "per month",
                description: "For study groups & teams",
                features: [
                  "Everything in Pro",
                  "Up to 10 team members",
                  "Shared knowledge base",
                  "Team analytics",
                  "Priority support",
                  "Custom integrations",
                  "Admin controls"
                ],
                buttonText: "Start Team Trial",
                popular: false,
                gradient: "from-rose-50 to-pink-50",
                borderColor: "border-rose-200"
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                className={`relative bg-gradient-to-br ${plan.gradient} rounded-[2rem] p-8 shadow-xl border-2 ${plan.borderColor} hover:shadow-2xl transition-all ${
                  plan.popular ? 'ring-4 ring-indigo-200 scale-105' : ''
                }`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                      ⭐ Most Popular
                    </div>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-black text-slate-800 mb-2">{plan.name}</h3>
                  <p className="text-sm text-slate-600 font-bold mb-6">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-black text-slate-800">{plan.price}</span>
                    <span className="text-slate-500 font-bold">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-indigo-600 text-xl flex-shrink-0">✓</span>
                      <span className="text-slate-700 font-bold text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={plan.popular ? "primary" : "secondary"}
                  size="lg" 
                  className="w-full py-4 text-lg font-black"
                  onClick={onGetStarted}
                >
                  {plan.buttonText}
                </Button>
              </motion.div>
            ))}
          </div>

          <motion.p 
            className="text-center text-slate-500 font-bold mt-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            viewport={{ once: true }}
          >
            All plans include a 14-day free trial • No credit card required
          </motion.p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '10K+', label: 'Active Students', icon: '👥' },
              { number: '500K+', label: 'Study Sessions', icon: '📖' },
              { number: '95%', label: 'Success Rate', icon: '🎯' },
              { number: '4.9/5', label: 'User Rating', icon: '⭐' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="text-center"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, duration: 0.5, type: "spring" }}
                viewport={{ once: true }}
              >
                <div className="text-5xl mb-4">{stat.icon}</div>
                <div className="text-5xl md:text-6xl font-black mb-2 font-display">{stat.number}</div>
                <div className="text-indigo-200 font-bold text-sm uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-100 rounded-full blur-3xl opacity-30" />
        
        <motion.div 
          className="max-w-4xl mx-auto text-center relative z-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-7xl font-black text-slate-800 mb-8 font-display leading-tight">
            Ready to <Highlighter color="#c7d2fe" action="box" strokeWidth={3} animationDuration={1400} isView={true}><span className="text-indigo-600">Level Up</span></Highlighter><br/> Your Study Game?
          </h2>
          <p className="text-2xl text-slate-600 font-bold mb-12 max-w-2xl mx-auto">
            Join thousands of students who are studying smarter, not harder
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-16 py-6 text-2xl shadow-2xl shadow-indigo-200" onClick={onGetStarted}>
              Get Started Free
            </Button>
            <Button variant="secondary" size="lg" className="px-16 py-6 text-2xl border-2 border-slate-100">
              Book a Demo
            </Button>
          </div>
          <p className="text-sm text-slate-400 font-bold mt-8">No credit card required • Free forever plan available</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="p-12 border-t-2 border-slate-50 bg-slate-50/50 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
             <button 
              onClick={handleLogoClick}
              className={`w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg border-b-2 border-indigo-800 transition-all active:translate-y-0.5 active:border-b-0 ${isAnimating ? 'animate-logo-pop' : ''}`}
            >
              <span className="text-white font-black text-lg">C</span>
            </button>
            <span className="text-xl font-black text-slate-800 tracking-tight">Collabry</span>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">© 2024 Collabry Labs. All rights reserved.</p>
          <div className="flex gap-6">
            <button className="text-slate-400 hover:text-indigo-500"><ICONS.Share size={20}/></button>
            <button className="text-slate-400 hover:text-indigo-500"><ICONS.Search size={20}/></button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

