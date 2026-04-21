import { supabase } from '../config/supabase';
import { User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { revenueCatService } from './revenueCat';
import { dataMigrationService } from './dataMigrationService';

// Check if native modules are available (not in Expo Go)
const isNativeModulesAvailable = () => {
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    return GoogleSignin !== undefined;
  } catch (error) {
    return false;
  }
};

// Only import and configure if not in Expo Go
let GoogleSignin: any = null;
let AppleAuthentication: any = null;

if (isNativeModulesAvailable()) {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  AppleAuthentication = require('expo-apple-authentication');
  
  // Configure Google Sign-In
  GoogleSignin.configure({
    iosClientId: '210266305289-i8chnb2a6r88f5ntdkstjbji1hprl9th.apps.googleusercontent.com', // Your iOS client ID
  });
}

const AUTH_KEYS = {
  EMAIL: 'auth_email',
  PASSWORD: 'auth_password',
  AUTO_LOGIN: 'auto_login_enabled',
};

export const authService = {
  // Check if native sign-in is available (not in Expo Go)
  isNativeSignInAvailable() {
    return GoogleSignin !== null && AppleAuthentication !== null;
  },

  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'studyninja://auth/verify', // Deep link for mobile
      }
    });
    
    if (error) throw error;
    
    // If user has made anonymous purchases, transfer them (with timeout)
    if (data.user && data.session) {
      try {
        const hadPreviousPurchase = await Promise.race([
          revenueCatService.linkAnonymousPurchaseToUser(data.user.id),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('RevenueCat linking timed out')), 10000)
          )
        ]) as boolean;
        
        if (hadPreviousPurchase) {
          console.log('✅ Transferred anonymous purchase to new account');
        }
      } catch (error) {
        console.error('Error transferring anonymous purchase:', error);
        // Don't fail signup if transfer fails
      }

      // Migrate local data to database for new authenticated user (with timeout)
      try {
        const hasLocalData = await dataMigrationService.hasLocalDataToMigrate();
        if (hasLocalData) {
          console.log('📱 Migrating local data to database for new user...');
          const migrationResult = await Promise.race([
            dataMigrationService.migrateLocalDataToDatabase(data.user.id),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Data migration timed out')), 15000)
            )
          ]) as any;
          
          if (migrationResult.success) {
            console.log('✅ Successfully migrated local data:', migrationResult.migratedData);
          } else {
            console.warn('⚠️ Data migration completed with errors:', migrationResult.errors);
          }
        }
      } catch (migrationError) {
        console.error('❌ Error during data migration:', migrationError);
        // Don't fail signup if migration fails
      }
    }
    
    // Check if email confirmation is required
    if (data.user && !data.session) {
      // User was created but needs to verify email via link
      return { ...data, needsVerification: true };
    }
    
    return { ...data, needsVerification: false };
  },

  async resendEmailVerification(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    
    if (error) throw error;
    return { success: true };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Check for anonymous purchases to transfer (with timeout)
    if (data.user) {
      try {
        await Promise.race([
          revenueCatService.linkAnonymousPurchaseToUser(data.user.id),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('RevenueCat linking timed out')), 10000)
          )
        ]);
      } catch (error) {
        console.error('Error linking purchases during sign in:', error);
        // Don't fail signin if transfer fails
      }

      // Migrate local data to database for returning user (with timeout)
      try {
        const hasLocalData = await dataMigrationService.hasLocalDataToMigrate();
        if (hasLocalData) {
          console.log('📱 Migrating local data to database for returning user...');
          const migrationResult = await Promise.race([
            dataMigrationService.migrateLocalDataToDatabase(data.user.id),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Data migration timed out')), 15000)
            )
          ]) as any;
          
          if (migrationResult.success) {
            console.log('✅ Successfully migrated local data:', migrationResult.migratedData);
          } else {
            console.warn('⚠️ Data migration completed with errors:', migrationResult.errors);
          }
        }
      } catch (migrationError) {
        console.error('❌ Error during data migration:', migrationError);
        // Don't fail signin if migration fails
      }
    }
    
    // Always save credentials for auto-login (with timeout)
    try {
      await Promise.race([
        this.saveCredentials(email, password),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Saving credentials timed out')), 5000)
        )
      ]);
    } catch (error) {
      console.error('Error saving credentials:', error);
      // Don't fail signin if credential saving fails
    }
    
    return data;
  },

  async signInWithGoogle() {
    // If native modules not available (Expo Go), do nothing
    if (!GoogleSignin) {
      return null;
    }

    try {
      console.log('Starting Google Sign-In...');
      
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Sign in with Google and get the ID token
      const userInfo = await GoogleSignin.signIn();
      
      // Check if user cancelled the sign-in
      if ((userInfo as any).type === 'cancelled') {
        return null;
      }
      
      // Try different possible locations for the ID token
      const idToken = userInfo.data?.idToken || (userInfo as any).idToken || userInfo.data?.serverAuthCode;
      
      if (idToken) {
        
        // Authenticate with Supabase using the ID token
        // Supabase is configured to skip nonce checks for native mobile apps
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
        
        if (error) {
          console.error('Supabase authentication error:', error);
          throw error;
        }
        
        return data;
      } else {
        // No ID token usually means user cancelled or sign-in was interrupted
        return null;
      }
    } catch (error: any) {
      // Check if the error is due to user cancellation
      const isCancellation = 
        error?.code === 'SIGN_IN_CANCELLED' ||
        error?.code === '-5' ||
        error?.message?.includes('cancelled') ||
        error?.message?.includes('canceled') ||
        error?.toString()?.includes('cancelled') ||
        error?.toString()?.includes('canceled');
      
      if (isCancellation) {
        // User cancelled sign-in, return silently without error
        return null;
      }
      
      console.error('Google sign-in error:', error);
      throw error;
    }
  },

  async signInWithApple() {
    // If native modules not available (Expo Go), do nothing
    if (!AppleAuthentication) {
      return null;
    }

    try {
      console.log('Starting Apple Sign-In...');
      
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign-In is not available on this device');
      }
      
      // Request Apple ID credential
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // Check if we have the required data
      if (!credential.identityToken) {
        throw new Error('Apple Sign-In failed: No identity token received');
      }
      
      // Authenticate with Supabase using the Apple ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      
      if (error) {
        console.error('Supabase Apple authentication error:', error);
        throw error;
      }
      
      console.log('Apple Sign-In successful:', data);
      return data;
    } catch (error: any) {
      // Check if the error is due to user cancellation
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('Apple Sign-In was cancelled by user');
        return null;
      }
      
      console.error('Apple Sign-In error:', error);
      throw error;
    }
  },

  async signOut() {
    // Clear saved credentials on sign out
    await this.clearSavedCredentials();
    
    // Clear onboarding data to force onboarding flow on next app start
    try {
      await AsyncStorage.multiRemove([
        'has_seen_onboarding',
        'onboarding_data',
        'onboarding_just_completed'
      ]);
      console.log('Onboarding data cleared - user will see onboarding flow on next start');
    } catch (error) {
      console.error('Error clearing onboarding data:', error);
    }
    
    // Sign out from Google as well
    if (GoogleSignin) {
      try {
        await GoogleSignin.signOut();
      } catch (error) {
        console.log('Google sign out error (non-critical):', error);
      }
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async deleteAccount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Delete user data from custom tables (CASCADE will handle related data)
      const { error: deleteUserDataError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);
      
      if (deleteUserDataError) throw deleteUserDataError;

      // Clear local data
      await this.clearSavedCredentials();
      await AsyncStorage.multiRemove([
        'has_seen_onboarding',
        'onboarding_data',
        'onboarding_just_completed'
      ]);

      // Log out of RevenueCat
      await revenueCatService.logOut();

      // Sign out (auth user will be automatically cleaned up)
      await supabase.auth.signOut();

      return { success: true };
    } catch (error) {
      console.error('Account deletion error:', error);
      throw error;
    }
  },

  async saveCredentials(email: string, password: string) {
    try {
      await AsyncStorage.multiSet([
        [AUTH_KEYS.EMAIL, email],
        [AUTH_KEYS.PASSWORD, password],
        [AUTH_KEYS.AUTO_LOGIN, 'true'],
      ]);
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  },

  async getSavedCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      const values = await AsyncStorage.multiGet([
        AUTH_KEYS.EMAIL,
        AUTH_KEYS.PASSWORD,
        AUTH_KEYS.AUTO_LOGIN,
      ]);
      
      const email = values[0][1];
      const password = values[1][1];
      const autoLogin = values[2][1];
      
      if (email && password && autoLogin === 'true') {
        return { email, password };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting saved credentials:', error);
      return null;
    }
  },

  async clearSavedCredentials() {
    try {
      await AsyncStorage.multiRemove([
        AUTH_KEYS.EMAIL,
        AUTH_KEYS.PASSWORD,
        AUTH_KEYS.AUTO_LOGIN,
      ]);
    } catch (error) {
      console.error('Error clearing credentials:', error);
    }
  },

  async autoLogin(): Promise<boolean> {
    try {
      const credentials = await this.getSavedCredentials();
      if (credentials) {
        await this.signIn(credentials.email, credentials.password);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Auto-login failed:', error);
      // Clear invalid credentials
      await this.clearSavedCredentials();
      return false;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Initialize RevenueCat for the user if not already done
    try {
      await revenueCatService.initialize(user.id);
    } catch (error) {
      console.error('Error initializing RevenueCat for user:', error);
    }

    // Get additional user data from users table
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email!,
      name: userData?.name || user.user_metadata?.name || null,
      isPremium: userData?.is_premium || false,
      createdAt: user.created_at,
    };
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });
  },
}; 