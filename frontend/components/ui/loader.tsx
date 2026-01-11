'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmoothCursor } from './smooth-cursor';

interface LoaderProps {
  onComplete?: () => void;
  duration?: number;
}

const Loader: React.FC<LoaderProps> = ({ onComplete, duration = 3000 }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    { text: "Initializing Collabry", color: "text-brand-600" },
    { text: "Loading AI Engine", color: "text-blue-600" },
    { text: "Preparing Study Tools", color: "text-emerald-600" },
    { text: "Ready to Collaborate", color: "text-purple-600" }
  ];

  useEffect(() => {
    const stepInterval = duration / steps.length;

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          setIsComplete(true);
          setTimeout(() => {
            onComplete?.();
          }, 500);
          clearInterval(timer);
          return prev;
        }
      });
    }, stepInterval);

    return () => clearInterval(timer);
  }, [duration, steps.length, onComplete]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.2
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const logoVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        duration: 1,
        type: "spring" as const,
        stiffness: 100
      }
    }
  };

  const progressVariants = {
    hidden: { width: 0 },
    visible: {
      width: `${((currentStep + 1) / steps.length) * 100}%`,
      transition: { duration: 0.8 }
    }
  };

  return (
    <>
    <SmoothCursor />
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-brand-950 dark:via-slate-900 dark:to-brand-900"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="text-center space-y-8 max-w-md mx-auto px-6">
            {/* Logo Animation */}
            <motion.div
              variants={logoVariants}
              initial="hidden"
              animate="visible"
              className="relative"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity
                }}
                className="w-24 h-24 mx-auto bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center shadow-2xl"
              >
                <span className="text-3xl font-bold text-white font-['Fredoka']">C</span>
              </motion.div>

              {/* Floating particles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-brand-400 rounded-full"
                  style={{
                    top: `${20 + Math.sin(i * 60 * Math.PI / 180) * 30}%`,
                    left: `${20 + Math.cos(i * 60 * Math.PI / 180) * 30}%`,
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>

            {/* Title */}
            <motion.div variants={itemVariants}>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-brand-600 via-blue-600 to-purple-600 bg-clip-text text-transparent font-['Fredoka'] mb-2">
                Collabry
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 font-['Quicksand'] font-medium">
                AI Collaborative Study Platform
              </p>
            </motion.div>

            {/* Loading Steps */}
            <motion.div variants={itemVariants} className="space-y-4">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={`text-xl font-semibold font-['Quicksand'] ${steps[currentStep].color}`}
                >
                  {steps[currentStep].text}
                </motion.p>
              </AnimatePresence>

              {/* Loading Dots */}
              <div className="flex justify-center space-x-2">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 bg-brand-500 rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Tagline */}
            <motion.div variants={itemVariants}>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-['Caveat'] italic">
                Study smarter together ✨
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default Loader;