import { supabase } from '../config/supabase';
import { localStorageService } from './localStorageService';

export interface DailyPracticeData {
  id: string;
  user_id: string;
  practice_date: string;
  minutes_practiced: number;
  questions_answered: number;
  questions_correct: number;
  daily_goal_minutes: number;
  created_at: string;
}

export interface DailyGoalStats {
  todayMinutes: number;
  todayQuestions: number;
  dailyGoalMinutes: number;
  percentage: number;
  minutesRemaining: number;
  weeklyPracticeDays: number;
  weeklyProgressChange: number;
  currentStreak: number;
}

export const dailyPracticeService = {
  // ===== MAIN METHODS (AUTO-DETECT USER TYPE) =====
  
  async getTodaysPracticeForUser(userId?: string): Promise<DailyPracticeData | null> {
    if (userId) {
      return await this.getTodaysPractice(userId);
    } else {
      // Guest user - use local storage
      const localPractice = await localStorageService.getTodaysPractice();
      if (!localPractice) return null;
      
      // Convert to DailyPracticeData format
      return {
        id: 'local',
        user_id: 'guest',
        practice_date: localPractice.practice_date,
        minutes_practiced: localPractice.minutes_practiced,
        questions_answered: localPractice.questions_answered,
        questions_correct: localPractice.questions_correct,
        daily_goal_minutes: localPractice.daily_goal_minutes,
        created_at: localPractice.created_at,
      };
    }
  },

  async getDailyGoalStatsForUser(userId?: string): Promise<DailyGoalStats> {
    if (userId) {
      return await this.getDailyGoalStats(userId);
    } else {
      // Guest user - use local storage
      return await localStorageService.getDailyGoalStats();
    }
  },

  async updateTodaysPracticeForUser(
    userId: string | undefined, 
    minutesToAdd: number, 
    questionsAnswered: number = 0, 
    questionsCorrect: number = 0,
    dailyGoalMinutes: number = 60
  ): Promise<void> {
    if (userId) {
      await this.updateTodaysPractice(userId, minutesToAdd, questionsAnswered, questionsCorrect);
    } else {
      // Guest user - use local storage
      await localStorageService.updateDailyPractice(minutesToAdd, questionsAnswered, questionsCorrect, dailyGoalMinutes);
    }
  },

  // ===== DATABASE METHODS (AUTHENTICATED USERS) =====
  
  async getTodaysPractice(userId: string): Promise<DailyPracticeData | null> {
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Fetching today\'s practice for user:', userId, 'date:', today);
    
    const { data, error } = await supabase
      .from('daily_practice')
      .select('*')
      .eq('user_id', userId)
      .eq('practice_date', today)
      .single();

    if (error) {
      console.log('Daily practice query error:', error);
      if (error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }
    }
    
    console.log('Today\'s practice data:', data);
    return data;
  },

  async getUserDailyGoal(userId: string): Promise<number> {
    console.log('Fetching daily goal for user:', userId);
    
    const { data, error } = await supabase
      .from('users')
      .select('daily_goal_minutes')
      .eq('id', userId)
      .single();

    if (error) {
      console.log('User daily goal query error:', error);
      throw error;
    }
    
    console.log('User daily goal data:', data);
    return data?.daily_goal_minutes || 60; // Default to 60 minutes
  },

  async getWeeklyPracticeStats(userId: string): Promise<{ daysThisWeek: number; lastWeekDays: number }> {
    const today = new Date();
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - today.getDay());
    
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
    
    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);

    // Get this week's practice days
    const { data: thisWeekData, error: thisWeekError } = await supabase
      .from('daily_practice')
      .select('practice_date')
      .eq('user_id', userId)
      .gte('practice_date', startOfThisWeek.toISOString().split('T')[0])
      .gt('minutes_practiced', 0);

    if (thisWeekError) throw thisWeekError;

    // Get last week's practice days
    const { data: lastWeekData, error: lastWeekError } = await supabase
      .from('daily_practice')
      .select('practice_date')
      .eq('user_id', userId)
      .gte('practice_date', startOfLastWeek.toISOString().split('T')[0])
      .lte('practice_date', endOfLastWeek.toISOString().split('T')[0])
      .gt('minutes_practiced', 0);

    if (lastWeekError) throw lastWeekError;

    return {
      daysThisWeek: thisWeekData?.length || 0,
      lastWeekDays: lastWeekData?.length || 0
    };
  },

  async getCurrentStreak(userId: string): Promise<number> {
    // Get all practice days for the user, ordered by date descending
    const { data, error } = await supabase
      .from('daily_practice')
      .select('practice_date, minutes_practiced')
      .eq('user_id', userId)
      .gt('minutes_practiced', 0) // Only count days with actual practice
      .order('practice_date', { ascending: false });

    if (error) {
      console.log('Streak calculation error:', error);
      return 0;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let streak = 0;
    let checkingDate = new Date();
    
    // Find the most recent practice date
    const latestPracticeDate = data[0].practice_date;
    
    // If the latest practice was today, start counting from today
    // If the latest practice was yesterday, start counting from yesterday
    // If the latest practice was more than 1 day ago, streak is broken
    const daysSinceLastPractice = Math.floor((new Date(today).getTime() - new Date(latestPracticeDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastPractice > 1) {
      return 0; // Streak is broken if no practice yesterday or today
    }
    
    // Start checking from the most recent practice date
    if (latestPracticeDate === today) {
      checkingDate = new Date(); // Start from today
    } else {
      checkingDate = new Date(yesterday); // Start from yesterday
    }

    // Count consecutive days backwards from the starting point
    for (let i = 0; i < data.length; i++) {
      const practiceDate = data[i].practice_date;
      const expectedDate = new Date(checkingDate);
      expectedDate.setDate(checkingDate.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];

      if (practiceDate === expectedDateStr) {
        streak++;
      } else {
        // Gap found, streak ends
        break;
      }
    }

    return streak;
  },

  async getDailyGoalStats(userId: string): Promise<DailyGoalStats> {
    const [todaysPractice, dailyGoalMinutes, weeklyStats, currentStreak] = await Promise.all([
      this.getTodaysPractice(userId),
      this.getUserDailyGoal(userId),
      this.getWeeklyPracticeStats(userId),
      this.getCurrentStreak(userId)
    ]);

    const todayMinutes = todaysPractice?.minutes_practiced || 0;
    const todayQuestions = todaysPractice?.questions_answered || 0;
    const percentage = Math.min(Math.round((todayMinutes / dailyGoalMinutes) * 100), 100);
    const minutesRemaining = Math.max(dailyGoalMinutes - todayMinutes, 0);
    
    // Calculate weekly progress change
    const weeklyProgressChange = weeklyStats.lastWeekDays > 0 
      ? Math.round(((weeklyStats.daysThisWeek - weeklyStats.lastWeekDays) / weeklyStats.lastWeekDays) * 100)
      : 0;

    return {
      todayMinutes,
      todayQuestions,
      dailyGoalMinutes,
      percentage,
      minutesRemaining,
      weeklyPracticeDays: weeklyStats.daysThisWeek,
      weeklyProgressChange,
      currentStreak
    };
  },

  async updateTodaysPractice(userId: string, minutesToAdd: number, questionsAnswered: number = 0, questionsCorrect: number = 0): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const dailyGoalMinutes = await this.getUserDailyGoal(userId);

    const { error } = await supabase
      .from('daily_practice')
      .upsert({
        user_id: userId,
        practice_date: today,
        minutes_practiced: minutesToAdd,
        questions_answered: questionsAnswered,
        questions_correct: questionsCorrect,
        daily_goal_minutes: dailyGoalMinutes
      }, {
        onConflict: 'user_id,practice_date'
      });

    if (error) throw error;
  },

  // Helper method to create initial practice data for testing
  async createTestPracticeData(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      await this.updateTodaysPractice(userId, 30, 5, 4); // 30 minutes, 5 questions, 4 correct
      console.log('Created test practice data for user:', userId);
    } catch (error) {
      console.error('Error creating test practice data:', error);
    }
  }
}; 