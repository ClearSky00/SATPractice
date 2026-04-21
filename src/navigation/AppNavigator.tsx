import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppState, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the navigation parameter list
type RootStackParamList = {
  Main: undefined;
  QuestionPractice: {
    section: string;
    domain: string;
    subdomain: string | null;
    difficulty: string;
    generationParams: {
      section: 'math' | 'reading-writing';
      topic: string;
      subtopic?: string;
      difficulty: 'easy' | 'medium' | 'hard';
    };
    firstQuestion: any;
    initialUsage: {
      questionsUsed: number;
      monthlyLimit: number;
      remaining: number;
        };
  };

  Onboarding: undefined;
  Auth: undefined;
};

import { useAuth } from '../hooks/useAuth';
import { onboardingService } from '../services/onboarding';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import PracticeScreen from '../screens/PracticeScreen';
import QuestionPracticeScreen from '../screens/QuestionPracticeScreen';

import TestScreen from '../screens/TestScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Practice') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Test') {
            iconName = focused ? 'timer' : 'timer-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Practice" component={PracticeScreen} />
      <Tab.Screen name="Test" component={TestScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Deep linking configuration
  const linking = {
    prefixes: ['studyninja://'],
    config: {
      screens: {
        Auth: 'auth/verify',
        Main: 'main',
        Onboarding: 'onboarding',
      },
    },
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check onboarding completion flag
        const onboardingJustCompleted = await AsyncStorage.getItem('onboarding_just_completed');
        
        // If onboarding was just completed, clear the flag and force a fresh check
        if (onboardingJustCompleted) {
          await AsyncStorage.removeItem('onboarding_just_completed');
          console.log('Detected onboarding completion, refreshing app state');
        }
        
        // If user just became authenticated, add a small delay to allow data processing to complete
        const isNewAuth = user && (onboardingCompleted === null || showOnboarding === null);
        if (isNewAuth) {
          console.log('New authentication detected, waiting for data processing...');
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
        }
        
        // Check onboarding status for both authenticated and anonymous users
        const completed = await onboardingService.checkOnboardingStatus(user?.id);
        console.log('Onboarding status check for', user ? 'authenticated' : 'anonymous', 'user:', completed);
        
        setOnboardingCompleted(completed);
        setShowOnboarding(!completed);
        
        console.log('Navigation state updated: showOnboarding =', !completed, ', onboardingCompleted =', completed);
      } catch (error) {
        console.error('Error initializing app:', error);
        // Default to showing onboarding for new users
        setShowOnboarding(true);
        setOnboardingCompleted(false);
      }
    };

    initializeApp();

    // Listen for app state changes to re-check status
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        initializeApp();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [user, refreshKey]);

  // Enhanced polling mechanism - check for completion flag more frequently
  useEffect(() => {
    const interval = setInterval(async () => {
      const onboardingJustCompleted = await AsyncStorage.getItem('onboarding_just_completed');
      if (onboardingJustCompleted) {
        console.log('Polling detected onboarding completion for', user ? 'authenticated' : 'anonymous', 'user');
        // Immediately trigger a refresh
        setRefreshKey(prev => prev + 1);
      }
    }, 500); // Check every 500ms for faster response

    // Clear interval after 15 seconds (longer for data processing)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [user]);

  if (loading || showOnboarding === null || onboardingCompleted === null) {
    console.log('AppNavigator showing loading screen:', { loading, showOnboarding, onboardingCompleted, user: !!user });
    return <LoadingScreen />;
  }

  console.log('AppNavigator navigation decision:', { 
    user: !!user, 
    onboardingCompleted, 
    showOnboarding,
    userId: user?.id 
  });

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {showOnboarding ? (
          // Show onboarding first for new users
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen 
              name="QuestionPractice" 
              component={QuestionPracticeScreen}
              options={{ 
                headerShown: false,
                gestureEnabled: true
              }}
            />
          </>
        ) : user && onboardingCompleted ? (
          // Authenticated user with completed onboarding - GO TO MAIN APP
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen 
              name="QuestionPractice" 
              component={QuestionPracticeScreen}
              options={{ 
                headerShown: false,
                gestureEnabled: true
              }}
            />
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : user && !onboardingCompleted ? (
          // Authenticated user needs to complete onboarding
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen 
              name="QuestionPractice" 
              component={QuestionPracticeScreen}
              options={{ 
                headerShown: false,
                gestureEnabled: true
              }}
            />
          </>
        ) : (
          // Anonymous users can access main app after onboarding
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen 
              name="QuestionPractice" 
              component={QuestionPracticeScreen}
              options={{ 
                headerShown: false,
                gestureEnabled: true
              }}
            />
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 