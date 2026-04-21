import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Linking } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/config/supabase';
import { onboardingService } from './src/services/onboarding';
import { authService } from './src/services/auth';
import { revenueCatService } from './src/services/revenueCat';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const processOnboardingDataAfterAuth = async () => {
    try {
      const savedOnboardingData = await AsyncStorage.getItem('onboarding_data');
      if (savedOnboardingData) {
        console.log('Processing saved onboarding data after authentication...');
        const onboardingData = JSON.parse(savedOnboardingData);
        
        // Get current user to save onboarding data
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          // Ensure onboarding_completed is set to true
          const completeOnboardingData = {
            ...onboardingData,
            onboarding_completed: true
          };
          
          await onboardingService.updateOnboardingData(completeOnboardingData, currentUser.id);
          console.log('Onboarding data processed successfully after email verification');
          
          // Clear the saved data after processing
          await AsyncStorage.removeItem('onboarding_data');
          
          // Set a flag to force navigation refresh
          await AsyncStorage.setItem('onboarding_just_completed', 'true');
        }
      }
    } catch (onboardingError) {
      console.error('Error processing saved onboarding data after auth:', onboardingError);
    }
  };

  useEffect(() => {
    // Initialize RevenueCat on app startup for all users (anonymous and authenticated)
    const initializeRevenueCat = async () => {
      try {
        // Initialize without user ID for anonymous users initially
        await revenueCatService.initialize();
        console.log('RevenueCat initialized on app startup for anonymous user');
      } catch (error) {
        console.error('Failed to initialize RevenueCat on startup:', error);
      }
    };

    // Handle deep links for email verification
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      // Supabase will automatically handle the verification when the link is opened
      // The auth state change will trigger navigation
    };

    // Initialize RevenueCat immediately for anonymous users
    initializeRevenueCat();

    // Listen for deep links when app is already open
    const linkingListener = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Handle deep link when app is opened from closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Set up Supabase auth listener to handle session changes from email verification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      if (event === 'SIGNED_IN') {
        console.log('User signed in via email verification');
        // Re-initialize RevenueCat for the authenticated user to link anonymous purchases
        if (session?.user) {
          try {
            await revenueCatService.initialize(session.user.id);
          } catch (error) {
            console.error('Error initializing RevenueCat after sign in:', error);
          }
        }
        // Process onboarding data when user signs in (including email verification)
        await processOnboardingDataAfterAuth();
      } else if (event === 'SIGNED_OUT') {
        try {
          await revenueCatService.logOut();
          // Re-initialize for anonymous usage after logout
          await revenueCatService.initialize();
        } catch (error) {
          console.error('Error handling RevenueCat logout:', error);
        }
      }
    });

    return () => {
      linkingListener.remove();
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
