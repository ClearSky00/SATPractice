import { supabase } from '../config/supabase';
import { localStorageService } from './localStorageService';

export const onboardingService = {
  async checkOnboardingStatus(userId?: string): Promise<boolean> {
    try {
      // For anonymous users, check local storage
      if (!userId) {
        return await localStorageService.hasSeenOnboarding();
      }

      // For authenticated users, check database
      const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking onboarding status:', error);
        return false;
      }

      // If no user record exists, create one and return false (not completed)
      if (!data) {
        await this.createUserRecord(userId);
        return false;
      }

      return data?.onboarding_completed || false;
    } catch (error) {
      console.error('Error in checkOnboardingStatus:', error);
      return false;
    }
  },

  async createUserRecord(userId: string) {
    try {
      // Only create records for authenticated users
      if (!userId) {
        return;
      }

      // Get user email from auth
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user?.email || '',
          name: user?.user_metadata?.name || null,
          onboarding_completed: false
        });

      if (error && error.code !== '23505') { // Ignore duplicate key error
        console.error('Error creating user record:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in createUserRecord:', error);
      // Don't throw here, let the app continue
    }
  },

  async getUserOnboardingData(userId?: string) {
    try {
      // For anonymous users, return data from local storage
      if (!userId) {
        return await localStorageService.getOnboardingData();
      }

      // For authenticated users, get from database
      const { data, error } = await supabase
        .from('users')
        .select('target_score, sat_goal, goal_importance, daily_goal_minutes, onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error getting user onboarding data:', error);
        return null;
      }

      // If no user record exists, create one
      if (!data) {
        await this.createUserRecord(userId);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserOnboardingData:', error);
      return null;
    }
  },

  async updateOnboardingData(data: {
    target_score?: number;
    sat_goal?: string;
    goal_importance?: string;
    daily_goal_minutes?: number;
    onboarding_completed?: boolean;
  }, userId?: string) {
    try {
      // Only update database for authenticated users
      if (!userId) {
        console.log('Skipping database update for anonymous user');
        return true;
      }

      // First ensure user record exists
      await this.createUserRecord(userId);

      const { error } = await supabase
        .from('users')
        .update({
          ...data,
          onboarding_completed_at: data.onboarding_completed ? new Date().toISOString() : undefined,
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating onboarding data:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in updateOnboardingData:', error);
      throw error;
    }
  },
}; 