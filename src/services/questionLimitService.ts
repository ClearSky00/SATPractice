import { supabase } from '../config/supabase';
import { revenueCatService } from './revenueCat';
import { localStorageService } from './localStorageService';

const FREE_DAILY_QUESTION_LIMIT = 10;

export interface QuestionLimitStatus {
  canGenerate: boolean;
  questionsUsedToday: number;
  questionsRemaining: number;
  dailyLimit: number;
  isPremium: boolean;
  reachedLimit: boolean;
}

export class QuestionLimitService {
  private static instance: QuestionLimitService;

  static getInstance(): QuestionLimitService {
    if (!QuestionLimitService.instance) {
      QuestionLimitService.instance = new QuestionLimitService();
    }
    return QuestionLimitService.instance;
  }

  /**
   * Check if user can generate questions and get limit status
   */
  async checkQuestionLimit(userId?: string): Promise<QuestionLimitStatus> {
    try {
      // Check if user has premium subscription
      const isPremium = await revenueCatService.checkProEntitlement();
      
      if (isPremium) {
        // Premium users have unlimited questions
        return {
          canGenerate: true,
          questionsUsedToday: 0,
          questionsRemaining: 999999,
          dailyLimit: 999999,
          isPremium: true,
          reachedLimit: false,
        };
      }

      // Get today's question count based on user type
      const questionsUsedToday = await this.getTodaysQuestionCount(userId);
      const questionsRemaining = Math.max(0, FREE_DAILY_QUESTION_LIMIT - questionsUsedToday);
      const reachedLimit = questionsUsedToday >= FREE_DAILY_QUESTION_LIMIT;

      return {
        canGenerate: !reachedLimit,
        questionsUsedToday,
        questionsRemaining,
        dailyLimit: FREE_DAILY_QUESTION_LIMIT,
        isPremium: false,
        reachedLimit,
      };
    } catch (error) {
      console.error('Error checking question limit:', error);
      // On error, allow generation but show as free user
      return {
        canGenerate: true,
        questionsUsedToday: 0,
        questionsRemaining: FREE_DAILY_QUESTION_LIMIT,
        dailyLimit: FREE_DAILY_QUESTION_LIMIT,
        isPremium: false,
        reachedLimit: false,
      };
    }
  }

  /**
   * Present paywall when limit is reached
   */
  async presentPaywall(): Promise<boolean> {
    try {
      console.log('🔒 Daily question limit reached, showing paywall...');
      return await revenueCatService.presentPaywall();
    } catch (error) {
      console.error('Error presenting paywall:', error);
      return false;
    }
  }

  /**
   * Get today's question count for the current user
   */
  private async getTodaysQuestionCount(userId?: string): Promise<number> {
    try {
      if (userId) {
        // Authenticated user - count from database
        return await this.getTodaysQuestionCountFromDB(userId);
      } else {
        // Guest user - count from local storage
        return await localStorageService.getTodaysQuestionCount();
      }
    } catch (error) {
      console.error('Error getting today\'s question count:', error);
      return 0;
    }
  }

  /**
   * Get today's question count from database for authenticated users
   */
  private async getTodaysQuestionCountFromDB(userId: string): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Count unique questions attempted today
      const { data, error } = await supabase
        .from('user_attempts')
        .select('question_id')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${tomorrowStr}T00:00:00.000Z`);

      if (error) {
        console.error('Database error getting question count:', error);
        return 0;
      }

      // Count unique question IDs
      const uniqueQuestions = new Set(data?.map(attempt => attempt.question_id) || []);
      return uniqueQuestions.size;
    } catch (error) {
      console.error('Error getting question count from database:', error);
      return 0;
    }
  }

  /**
   * Record that a question was attempted (for tracking limits)
   * This is called when a user first sees a question, not when they answer it
   */
  async recordQuestionAttempt(questionId: string, userId?: string): Promise<void> {
    try {
      // We don't need to do anything special here since the question attempt
      // is already being tracked by the existing saveUserAttempt methods.
      // This method exists for future extensibility if needed.
      console.log(`Question ${questionId} attempted by user ${userId || 'guest'}`);
    } catch (error) {
      console.error('Error recording question attempt:', error);
    }
  }
}

export const questionLimitService = QuestionLimitService.getInstance(); 