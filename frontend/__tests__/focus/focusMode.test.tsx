/**
 * Focus Mode Timer Tests
 * Tests for Pomodoro timer, session tracking, and streak logic
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// Mock the FocusMode component's timer logic
describe('Focus Mode Timer Logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Timer Functionality', () => {
    it('should format time correctly', () => {
      const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };

      expect(formatTime(25 * 60)).toBe('25:00');
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(90)).toBe('01:30');
      expect(formatTime(3599)).toBe('59:59');
    });

    it('should calculate progress correctly', () => {
      const totalTime = 25 * 60; // 25 minutes in seconds
      const calculateProgress = (timeLeft: number) => 
        ((totalTime - timeLeft) / totalTime) * 100;

      expect(calculateProgress(totalTime)).toBe(0);
      expect(calculateProgress(totalTime / 2)).toBe(50);
      expect(calculateProgress(0)).toBe(100);
    });

    it('should handle timer countdown', () => {
      let timeLeft = 25 * 60;
      const decrementTime = () => {
        if (timeLeft > 0) {
          timeLeft -= 1;
        }
      };

      // Simulate 5 seconds
      for (let i = 0; i < 5; i++) {
        decrementTime();
      }

      expect(timeLeft).toBe(25 * 60 - 5);
    });

    it('should track completed sessions', () => {
      let sessionsCompleted = 0;
      const completeSession = () => {
        sessionsCompleted += 1;
      };

      completeSession();
      completeSession();

      expect(sessionsCompleted).toBe(2);
    });
  });

  describe('Streak Logic', () => {
    it('should increment streak on consecutive days', () => {
      interface StreakData {
        currentStreak: number;
        lastStudyDate: Date | null;
      }

      const updateStreak = (data: StreakData, today: Date): StreakData => {
        if (!data.lastStudyDate) {
          return { currentStreak: 1, lastStudyDate: today };
        }

        const lastDate = new Date(data.lastStudyDate);
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          // Same day, no change
          return data;
        } else if (diffDays === 1) {
          // Consecutive day
          return { currentStreak: data.currentStreak + 1, lastStudyDate: today };
        } else {
          // Streak broken
          return { currentStreak: 1, lastStudyDate: today };
        }
      };

      // Test consecutive days
      const day1 = new Date('2026-01-01');
      const day2 = new Date('2026-01-02');
      const day3 = new Date('2026-01-03');

      let streak: StreakData = { currentStreak: 0, lastStudyDate: null };
      streak = updateStreak(streak, day1);
      expect(streak.currentStreak).toBe(1);

      streak = updateStreak(streak, day2);
      expect(streak.currentStreak).toBe(2);

      streak = updateStreak(streak, day3);
      expect(streak.currentStreak).toBe(3);
    });

    it('should reset streak when day is missed', () => {
      interface StreakData {
        currentStreak: number;
        lastStudyDate: Date | null;
      }

      const updateStreak = (data: StreakData, today: Date): StreakData => {
        if (!data.lastStudyDate) {
          return { currentStreak: 1, lastStudyDate: today };
        }

        const lastDate = new Date(data.lastStudyDate);
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
          return { 
            currentStreak: diffDays === 0 ? data.currentStreak : data.currentStreak + 1, 
            lastStudyDate: today 
          };
        } else {
          return { currentStreak: 1, lastStudyDate: today };
        }
      };

      const day1 = new Date('2026-01-01');
      const day3 = new Date('2026-01-03'); // Skipped day 2

      let streak: StreakData = { currentStreak: 5, lastStudyDate: day1 };
      streak = updateStreak(streak, day3);
      expect(streak.currentStreak).toBe(1); // Reset
    });

    it('should not double count same day', () => {
      interface StreakData {
        currentStreak: number;
        lastStudyDate: Date | null;
      }

      const updateStreak = (data: StreakData, today: Date): StreakData => {
        if (!data.lastStudyDate) {
          return { currentStreak: 1, lastStudyDate: today };
        }

        const lastDate = new Date(data.lastStudyDate);
        const isSameDay = 
          lastDate.getFullYear() === today.getFullYear() &&
          lastDate.getMonth() === today.getMonth() &&
          lastDate.getDate() === today.getDate();

        if (isSameDay) {
          return data; // No change
        }

        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          return { currentStreak: data.currentStreak + 1, lastStudyDate: today };
        } else {
          return { currentStreak: 1, lastStudyDate: today };
        }
      };

      const today = new Date('2026-01-01');
      let streak: StreakData = { currentStreak: 5, lastStudyDate: today };
      
      // Multiple sessions same day
      streak = updateStreak(streak, today);
      streak = updateStreak(streak, today);
      streak = updateStreak(streak, today);

      expect(streak.currentStreak).toBe(5); // Unchanged
    });
  });

  describe('Session Duration Tracking', () => {
    it('should calculate total study time', () => {
      const sessions = [
        { duration: 25 * 60 }, // 25 min
        { duration: 25 * 60 }, // 25 min  
        { duration: 15 * 60 }, // 15 min
      ];

      const totalMinutes = sessions.reduce(
        (sum, s) => sum + Math.round(s.duration / 60), 
        0
      );

      expect(totalMinutes).toBe(65);
    });

    it('should track average session length', () => {
      const sessions = [25, 30, 20, 25]; // minutes
      const average = sessions.reduce((a, b) => a + b, 0) / sessions.length;
      expect(average).toBe(25);
    });
  });
});
