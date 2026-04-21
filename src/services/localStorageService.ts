import AsyncStorage from '@react-native-async-storage/async-storage';

// Local storage keys
const STORAGE_KEYS = {
  USER_ATTEMPTS: 'guest_user_attempts',
  DAILY_PRACTICE: 'guest_daily_practice', 
  PROGRESS_STATS: 'guest_progress_stats',
  ONBOARDING_DATA: 'onboarding_data',
  HAS_SEEN_ONBOARDING: 'has_seen_onboarding',
} as const;

// Types for local storage data
export interface LocalUserAttempt {
  id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  time_spent_seconds: number;
  section: string;
  domain: string;
  subdomain?: string;
  difficulty: string;
  created_at: string;
}

export interface LocalDailyPractice {
  practice_date: string; // YYYY-MM-DD format
  minutes_practiced: number;
  questions_answered: number;
  questions_correct: number;
  daily_goal_minutes: number;
  created_at: string;
}

export interface LocalProgressStats {
  totalQuestions: number;
  totalCorrect: number;
  sections: {
    [sectionKey: string]: {
      [domainKey: string]: {
        correct: number;
        total: number;
        subdomains?: {
          [subdomainKey: string]: {
            correct: number;
            total: number;
          };
        };
      };
    };
  };
  lastUpdated: string;
}

export interface LocalOnboardingData {
  sat_goal?: string;
  target_score?: number;
  goal_importance?: string;
  daily_goal_minutes?: number;
  onboarding_completed: boolean;
}

export const localStorageService = {
  // ===== USER ATTEMPTS =====
  async saveUserAttempt(attempt: Omit<LocalUserAttempt, 'id' | 'created_at'>): Promise<void> {
    try {
      const attempts = await this.getUserAttempts();
      const newAttempt: LocalUserAttempt = {
        ...attempt,
        id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
      };
      
      attempts.push(newAttempt);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ATTEMPTS, JSON.stringify(attempts));
      
      // Update progress stats
      await this.updateProgressStats(attempt.section, attempt.domain, attempt.subdomain, attempt.is_correct);
    } catch (error) {
      console.error('Error saving user attempt:', error);
    }
  },

  async getUserAttempts(): Promise<LocalUserAttempt[]> {
    try {
      const attemptsData = await AsyncStorage.getItem(STORAGE_KEYS.USER_ATTEMPTS);
      return attemptsData ? JSON.parse(attemptsData) : [];
    } catch (error) {
      console.error('Error getting user attempts:', error);
      return [];
    }
  },

  // ===== DAILY PRACTICE =====
  async updateDailyPractice(
    minutesPracticed: number, 
    questionsAnswered: number, 
    questionsCorrect: number,
    dailyGoalMinutes: number = 60
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const practiceData = await this.getDailyPracticeData();
      
      const existingIndex = practiceData.findIndex(p => p.practice_date === today);
      
      if (existingIndex >= 0) {
        // Update existing record
        practiceData[existingIndex] = {
          ...practiceData[existingIndex],
          minutes_practiced: practiceData[existingIndex].minutes_practiced + minutesPracticed,
          questions_answered: practiceData[existingIndex].questions_answered + questionsAnswered,
          questions_correct: practiceData[existingIndex].questions_correct + questionsCorrect,
          daily_goal_minutes: dailyGoalMinutes,
        };
      } else {
        // Create new record
        const newRecord: LocalDailyPractice = {
          practice_date: today,
          minutes_practiced: minutesPracticed,
          questions_answered: questionsAnswered,
          questions_correct: questionsCorrect,
          daily_goal_minutes: dailyGoalMinutes,
          created_at: new Date().toISOString(),
        };
        practiceData.push(newRecord);
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_PRACTICE, JSON.stringify(practiceData));
    } catch (error) {
      console.error('Error updating daily practice:', error);
    }
  },

  async getDailyPracticeData(): Promise<LocalDailyPractice[]> {
    try {
      const practiceData = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_PRACTICE);
      return practiceData ? JSON.parse(practiceData) : [];
    } catch (error) {
      console.error('Error getting daily practice data:', error);
      return [];
    }
  },

  async getTodaysPractice(): Promise<LocalDailyPractice | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const practiceData = await this.getDailyPracticeData();
      return practiceData.find(p => p.practice_date === today) || null;
    } catch (error) {
      console.error('Error getting today\'s practice:', error);
      return null;
    }
  },

  /**
   * Get today's question count for guest users (for daily limit checking)
   */
  async getTodaysQuestionCount(): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attempts = await this.getUserAttempts();
      
      // Count unique questions attempted today
      const todaysQuestions = new Set();
      attempts.forEach(attempt => {
        const attemptDate = attempt.created_at.split('T')[0];
        if (attemptDate === today) {
          todaysQuestions.add(attempt.question_id);
        }
      });
      
      return todaysQuestions.size;
    } catch (error) {
      console.error('Error getting today\'s question count:', error);
      return 0;
    }
  },

  // ===== PROGRESS STATS =====
  async updateProgressStats(
    section: string, 
    domain: string, 
    subdomain: string | undefined, 
    isCorrect: boolean
  ): Promise<void> {
    try {
      const stats = await this.getProgressStats();
      
      // Map topic display names to domain IDs (same mapping as database)
      const topicToDomain: { [key: string]: string } = {
        // Reading & Writing topics
        'Information and Ideas': 'information-ideas',
        'Central Ideas and Details': 'information-ideas',
        'Command of Evidence': 'information-ideas',
        'Inference': 'information-ideas',
        'Craft and Structure': 'craft-structure',
        'Text Structure and Purpose': 'craft-structure',
        'Words in Context': 'craft-structure',
        'Expression of Ideas': 'expression-ideas',
        'Rhetorical Synthesis': 'expression-ideas',
        'Transitions': 'expression-ideas',
        'Standard English Conventions': 'standard-english',
        'Boundaries': 'standard-english',
        'Form, Structure, Sense': 'standard-english',
        
        // Math topics
        'Algebra': 'algebra',
        'Linear Equations': 'algebra',
        'Linear Functions': 'algebra',
        'Systems of Equations': 'algebra',
        'Advanced Math': 'advanced-math',
        'Equivalent Expressions': 'advanced-math',
        'Nonlinear Equations': 'advanced-math',
        'Nonlinear Functions': 'advanced-math',
        'Problem-Solving and Data Analysis': 'problem-solving-data',
        'Ratios and Rates': 'problem-solving-data',
        'Percentages': 'problem-solving-data',
        'Probability': 'problem-solving-data',
        'Geometry and Trigonometry': 'geometry-trigonometry',
        'Area and Volume': 'geometry-trigonometry',
        'Triangles': 'geometry-trigonometry',
        'Circles': 'geometry-trigonometry',
      };

      // Convert topic display name to domain ID
      const domainId = topicToDomain[domain] || 
                      topicToDomain[domain?.toLowerCase()] || 
                      (section === 'math' ? 'algebra' : 'information-ideas'); // fallback
      
      console.log(`Local storage: mapping topic "${domain}" to domain ID "${domainId}" in section "${section}"`);
      if (subdomain) {
        console.log(`Local storage: also tracking subdomain "${subdomain}"`);
      }
      
      // Initialize section if it doesn't exist
      if (!stats.sections[section]) {
        stats.sections[section] = {};
      }
      
      // Initialize domain if it doesn't exist
      if (!stats.sections[section][domainId]) {
        stats.sections[section][domainId] = { correct: 0, total: 0 };
      }
      
      // Update domain stats
      stats.sections[section][domainId].total += 1;
      if (isCorrect) {
        stats.sections[section][domainId].correct += 1;
      }
      
      // Update subdomain stats if provided
      if (subdomain) {
        if (!stats.sections[section][domainId].subdomains) {
          stats.sections[section][domainId].subdomains = {};
        }
        if (!stats.sections[section][domainId].subdomains![subdomain]) {
          stats.sections[section][domainId].subdomains![subdomain] = { correct: 0, total: 0 };
        }
        
        stats.sections[section][domainId].subdomains![subdomain].total += 1;
        if (isCorrect) {
          stats.sections[section][domainId].subdomains![subdomain].correct += 1;
        }
      }
      
      // Update overall stats
      stats.totalQuestions += 1;
      if (isCorrect) {
        stats.totalCorrect += 1;
      }
      stats.lastUpdated = new Date().toISOString();
      
      await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS_STATS, JSON.stringify(stats));
    } catch (error) {
      console.error('Error updating progress stats:', error);
    }
  },

  async getProgressStats(): Promise<LocalProgressStats> {
    try {
      const statsData = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS_STATS);
      return statsData ? JSON.parse(statsData) : {
        totalQuestions: 0,
        totalCorrect: 0,
        sections: {},
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting progress stats:', error);
      return {
        totalQuestions: 0,
        totalCorrect: 0,
        sections: {},
        lastUpdated: new Date().toISOString(),
      };
    }
  },

  // ===== ONBOARDING DATA =====
  async saveOnboardingData(data: LocalOnboardingData): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DATA, JSON.stringify(data));
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING, 'true');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  },

  async getOnboardingData(): Promise<LocalOnboardingData | null> {
    try {
      const onboardingData = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DATA);
      return onboardingData ? JSON.parse(onboardingData) : null;
    } catch (error) {
      console.error('Error getting onboarding data:', error);
      return null;
    }
  },

  async hasSeenOnboarding(): Promise<boolean> {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING);
      return hasSeenOnboarding === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  },

  // ===== DAILY GOAL STATS CALCULATION =====
  async getDailyGoalStats(): Promise<{
    todayMinutes: number;
    todayQuestions: number;
    dailyGoalMinutes: number;
    percentage: number;
    minutesRemaining: number;
    weeklyPracticeDays: number;
    weeklyProgressChange: number;
    currentStreak: number;
  }> {
    try {
      const [todaysPractice, practiceData, onboardingData] = await Promise.all([
        this.getTodaysPractice(),
        this.getDailyPracticeData(),
        this.getOnboardingData(),
      ]);

      const todayMinutes = todaysPractice?.minutes_practiced || 0;
      const todayQuestions = todaysPractice?.questions_answered || 0;
      const dailyGoalMinutes = onboardingData?.daily_goal_minutes || 60;
      const percentage = Math.min(Math.round((todayMinutes / dailyGoalMinutes) * 100), 100);
      const minutesRemaining = Math.max(dailyGoalMinutes - todayMinutes, 0);

      // Calculate weekly stats
      const today = new Date();
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - today.getDay());
      
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
      
      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);

      const thisWeekDays = practiceData.filter(p => {
        const practiceDate = new Date(p.practice_date);
        return practiceDate >= startOfThisWeek && p.minutes_practiced > 0;
      }).length;

      const lastWeekDays = practiceData.filter(p => {
        const practiceDate = new Date(p.practice_date);
        return practiceDate >= startOfLastWeek && practiceDate <= endOfLastWeek && p.minutes_practiced > 0;
      }).length;

      const weeklyProgressChange = lastWeekDays > 0 
        ? Math.round(((thisWeekDays - lastWeekDays) / lastWeekDays) * 100)
        : 0;

      // Calculate current streak
      const sortedPractice = practiceData
        .filter(p => p.minutes_practiced > 0)
        .sort((a, b) => new Date(b.practice_date).getTime() - new Date(a.practice_date).getTime());

      let currentStreak = 0;
      const todayDate = new Date().toISOString().split('T')[0];
      
      for (let i = 0; i < sortedPractice.length; i++) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        const expectedDateStr = expectedDate.toISOString().split('T')[0];
        
        if (sortedPractice[i]?.practice_date === expectedDateStr) {
          currentStreak++;
        } else {
          break;
        }
      }

      return {
        todayMinutes,
        todayQuestions,
        dailyGoalMinutes,
        percentage,
        minutesRemaining,
        weeklyPracticeDays: thisWeekDays,
        weeklyProgressChange,
        currentStreak,
      };
    } catch (error) {
      console.error('Error calculating daily goal stats:', error);
      return {
        todayMinutes: 0,
        todayQuestions: 0,
        dailyGoalMinutes: 60,
        percentage: 0,
        minutesRemaining: 60,
        weeklyPracticeDays: 0,
        weeklyProgressChange: 0,
        currentStreak: 0,
      };
    }
  },

  // ===== DATA CLEARING =====
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_ATTEMPTS,
        STORAGE_KEYS.DAILY_PRACTICE,
        STORAGE_KEYS.PROGRESS_STATS,
        STORAGE_KEYS.ONBOARDING_DATA,
        STORAGE_KEYS.HAS_SEEN_ONBOARDING,
      ]);
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  },

  // ===== GET ALL DATA FOR MIGRATION =====
  async getAllDataForMigration(): Promise<{
    userAttempts: LocalUserAttempt[];
    dailyPractice: LocalDailyPractice[];
    progressStats: LocalProgressStats;
    onboardingData: LocalOnboardingData | null;
  }> {
    try {
      const [userAttempts, dailyPractice, progressStats, onboardingData] = await Promise.all([
        this.getUserAttempts(),
        this.getDailyPracticeData(),
        this.getProgressStats(),
        this.getOnboardingData(),
      ]);

      return {
        userAttempts,
        dailyPractice,
        progressStats,
        onboardingData,
      };
    } catch (error) {
      console.error('Error getting all data for migration:', error);
      return {
        userAttempts: [],
        dailyPractice: [],
        progressStats: {
          totalQuestions: 0,
          totalCorrect: 0,
          sections: {},
          lastUpdated: new Date().toISOString(),
        },
        onboardingData: null,
      };
    }
  },
}; 