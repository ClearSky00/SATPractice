import { supabase } from '../config/supabase';
import { localStorageService, LocalUserAttempt, LocalDailyPractice, LocalOnboardingData } from './localStorageService';

export interface MigrationResult {
  success: boolean;
  migratedData: {
    userAttempts: number;
    dailyPractice: number;
    onboardingData: boolean;
  };
  errors: string[];
}

export const dataMigrationService = {
  /**
   * Migrate all local storage data to database for authenticated user
   * Uses conservative approach: preserves existing database data over local data
   */
  async migrateLocalDataToDatabase(userId: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedData: {
        userAttempts: 0,
        dailyPractice: 0,
        onboardingData: false,
      },
      errors: [],
    };

    try {
      console.log('Starting data migration for user:', userId);
      
      // Get all local data
      const localData = await localStorageService.getAllDataForMigration();
      
      // Ensure user exists in database
      await this.ensureUserExists(userId);
      
      // Migrate each type of data
      await Promise.all([
        this.migrateUserAttempts(userId, localData.userAttempts, result),
        this.migrateDailyPractice(userId, localData.dailyPractice, result),
        this.migrateOnboardingData(userId, localData.onboardingData, result),
      ]);

      // Clear local storage after successful migration
      if (result.success && result.errors.length === 0) {
        await localStorageService.clearAllData();
        console.log('Successfully migrated and cleared local data');
      } else {
        console.warn('Migration completed with errors, keeping local data as backup');
        result.success = false;
      }

      return result;
    } catch (error) {
      console.error('Critical error during data migration:', error);
      result.success = false;
      result.errors.push(`Critical migration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  },

  /**
   * Ensure user record exists in users table
   */
  async ensureUserExists(userId: string): Promise<void> {
    try {
      // Get user auth info
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('User not authenticated');

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!existingUser) {
        // Create user record
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: user.email || '',
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            daily_goal_minutes: 60,
          });

        if (insertError) throw insertError;
        console.log('Created user record for:', userId);
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      throw error;
    }
  },

  /**
   * Migrate user attempts from local storage to database
   * Conservative approach: Skips duplicate attempts (already implemented)
   */
  async migrateUserAttempts(userId: string, attempts: LocalUserAttempt[], result: MigrationResult): Promise<void> {
    if (attempts.length === 0) return;

    try {
      console.log(`Migrating ${attempts.length} user attempts...`);
      
      // Transform local attempts to database format
      const dbAttempts = attempts.map(attempt => ({
        user_id: userId,
        question_id: attempt.question_id,
        selected_answer: attempt.selected_answer,
        is_correct: attempt.is_correct,
        time_spent_seconds: attempt.time_spent_seconds,
        created_at: attempt.created_at,
      }));

      // Insert in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < dbAttempts.length; i += batchSize) {
        const batch = dbAttempts.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('user_attempts')
          .insert(batch);

        if (error) {
          // If there are duplicate entries, continue but log the error
          if (error.code === '23505') { // Unique constraint violation
            console.warn('Some user attempts already exist, skipping duplicates');
          } else {
            throw error;
          }
        }
      }

      result.migratedData.userAttempts = attempts.length;
      console.log(`Successfully migrated ${attempts.length} user attempts`);
    } catch (error) {
      console.error('Error migrating user attempts:', error);
      result.errors.push(`User attempts migration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Migrate daily practice data from local storage to database
   * Conservative approach: Only migrate if no existing data for that date
   */
  async migrateDailyPractice(userId: string, practiceData: LocalDailyPractice[], result: MigrationResult): Promise<void> {
    if (practiceData.length === 0) return;

    try {
      console.log(`Migrating ${practiceData.length} daily practice records...`);
      
      // Transform local practice data to database format
      const dbPracticeData = practiceData.map(practice => ({
        user_id: userId,
        practice_date: practice.practice_date,
        minutes_practiced: practice.minutes_practiced,
        questions_answered: practice.questions_answered,
        questions_correct: practice.questions_correct,
        daily_goal_minutes: practice.daily_goal_minutes,
        created_at: practice.created_at,
      }));

      // Check for existing records first to avoid conflicts
      const practiceDates = dbPracticeData.map(p => p.practice_date);
      const { data: existingRecords, error: checkError } = await supabase
        .from('daily_practice')
        .select('practice_date')
        .eq('user_id', userId)
        .in('practice_date', practiceDates);

      if (checkError) {
        console.error('Error checking existing practice records:', checkError);
        result.errors.push(`Error checking existing records: ${checkError.message}`);
        return;
      }

      // Filter out records that already exist in the database
      const existingDates = new Set(existingRecords?.map(r => r.practice_date) || []);
      const recordsToMigrate = dbPracticeData.filter(practice => !existingDates.has(practice.practice_date));
      
      if (recordsToMigrate.length === 0) {
        console.log('No new daily practice records to migrate (all dates already exist)');
        result.migratedData.dailyPractice = 0;
        return;
      }

      // Insert only new records (no conflicts)
      let migratedCount = 0;
      for (const practice of recordsToMigrate) {
        try {
          const { error } = await supabase
            .from('daily_practice')
            .insert(practice);

          if (error) {
            if (error.code === '23505') { // Unique constraint violation (rare edge case)
              console.warn(`Skipping duplicate practice record for ${practice.practice_date}`);
            } else {
              throw error;
            }
          } else {
            migratedCount++;
          }
        } catch (recordError) {
          console.warn(`Failed to migrate practice record for ${practice.practice_date}:`, recordError);
          result.errors.push(`Practice record ${practice.practice_date}: ${recordError instanceof Error ? recordError.message : 'Unknown error'}`);
        }
      }

      const skippedCount = practiceData.length - migratedCount;
      if (skippedCount > 0) {
        console.log(`Migrated ${migratedCount} new practice records, skipped ${skippedCount} existing records`);
      } else {
        console.log(`Successfully migrated ${migratedCount} daily practice records`);
      }
      
      result.migratedData.dailyPractice = migratedCount;
    } catch (error) {
      console.error('Error migrating daily practice data:', error);
      result.errors.push(`Daily practice migration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Migrate onboarding data from local storage to database
   * Conservative approach: Only update null/default values, preserve existing user preferences
   */
  async migrateOnboardingData(userId: string, onboardingData: LocalOnboardingData | null, result: MigrationResult): Promise<void> {
    if (!onboardingData) return;

    try {
      console.log('Migrating onboarding data (conservative approach)...');
      
      // First, get current user data to check what's already set
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('target_score, sat_goal, goal_importance, daily_goal_minutes, onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Build update object only for null/default values
      const updateData: any = {};
      let hasUpdates = false;

      // Only update daily_goal_minutes if not set or is default value (60)
      if (onboardingData.daily_goal_minutes && 
          (!currentUser?.daily_goal_minutes || currentUser.daily_goal_minutes === 60)) {
        updateData.daily_goal_minutes = onboardingData.daily_goal_minutes;
        hasUpdates = true;
      }

      // Only update target_score if not set
      if (onboardingData.target_score !== undefined && !currentUser?.target_score) {
        updateData.target_score = onboardingData.target_score;
        hasUpdates = true;
      }

      // Only update sat_goal if not set
      if (onboardingData.sat_goal && !currentUser?.sat_goal) {
        updateData.sat_goal = onboardingData.sat_goal;
        hasUpdates = true;
      }

      // Only update goal_importance if not set
      if (onboardingData.goal_importance && !currentUser?.goal_importance) {
        updateData.goal_importance = onboardingData.goal_importance;
        hasUpdates = true;
      }

      // Always update onboarding_completed if local says it's completed and DB says it's not
      if (onboardingData.onboarding_completed && !currentUser?.onboarding_completed) {
        updateData.onboarding_completed = true;
        hasUpdates = true;
      }

      if (hasUpdates) {
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId);

        if (error) throw error;

        console.log('Successfully migrated onboarding data:', Object.keys(updateData));
        result.migratedData.onboardingData = true;
      } else {
        console.log('No onboarding data to migrate (user preferences already set)');
        result.migratedData.onboardingData = false;
      }
    } catch (error) {
      console.error('Error migrating onboarding data:', error);
      result.errors.push(`Onboarding data migration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Check if user has local data that needs migration
   */
  async hasLocalDataToMigrate(): Promise<boolean> {
    try {
      const localData = await localStorageService.getAllDataForMigration();
      
      return (
        localData.userAttempts.length > 0 ||
        localData.dailyPractice.length > 0 ||
        Boolean(localData.onboardingData?.onboarding_completed)
      );
    } catch (error) {
      console.error('Error checking for local data:', error);
      return false;
    }
  },

  /**
   * Get migration summary for display to user
   */
  async getMigrationSummary(): Promise<{
    hasData: boolean;
    summary: {
      questionsAnswered: number;
      practiceMinutes: number;
      practiceDays: number;
      onboardingCompleted: boolean;
    };
  }> {
    try {
      const localData = await localStorageService.getAllDataForMigration();
      
      const questionsAnswered = localData.userAttempts.length;
      const practiceMinutes = localData.dailyPractice.reduce((total, day) => total + day.minutes_practiced, 0);
      const practiceDays = localData.dailyPractice.filter(day => day.minutes_practiced > 0).length;
      const onboardingCompleted = Boolean(localData.onboardingData?.onboarding_completed);

      return {
        hasData: questionsAnswered > 0 || practiceMinutes > 0 || onboardingCompleted,
        summary: {
          questionsAnswered,
          practiceMinutes,
          practiceDays,
          onboardingCompleted,
        },
      };
    } catch (error) {
      console.error('Error getting migration summary:', error);
      return {
        hasData: false,
        summary: {
          questionsAnswered: 0,
          practiceMinutes: 0,
          practiceDays: 0,
          onboardingCompleted: false,
        },
      };
    }
  },
}; 