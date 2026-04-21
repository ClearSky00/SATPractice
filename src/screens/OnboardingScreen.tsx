import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';
import { onboardingService } from '../services/onboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/auth';
import { revenueCatService } from '../services/revenueCat';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  navigation: any;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [selectedImportance, setSelectedImportance] = useState<string | null>(null);
  const [selectedDailyGoal, setSelectedDailyGoal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Reset and animate in when step changes
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.95);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: (currentStep + 1) / steps.length,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start();
  }, [currentStep]);

  const steps = [
    {
      title: "Why are you taking the SAT?",
      subtitle: "Let's personalize your journey to success",
      type: "goal" as const,
    },
    {
      title: "Dream big, aim high",
      subtitle: "What score will unlock your future?",
      type: "score" as const,
    },
    {
      title: "How committed are you?",
      subtitle: "This shapes your personalized experience",
      type: "importance" as const,
    },
    {
      title: "Your daily practice goal",
      subtitle: "Consistency is key to SAT success",
      type: "dailyGoal" as const,
    },
    {
      title: "You're all set!",
      subtitle: "Start practicing immediately - no account required",
      type: "completion" as const,
    }
  ];

  const goalOptions = [
    { 
      id: 'top-college', 
      label: 'Elite university admission', 
      icon: 'school-outline', 
      gradient: ['#667eea', '#764ba2'],
      description: 'Ivy League & top-tier schools'
    },
    { 
      id: 'stand-out', 
      label: 'Standout applications', 
      icon: 'star-outline', 
      gradient: ['#f093fb', '#f5576c'],
      description: 'Be memorable to admissions'
    },
    { 
      id: 'scholarships', 
      label: 'Merit scholarships', 
      icon: 'trophy-outline', 
      gradient: ['#4facfe', '#00f2fe'],
      description: 'Financial aid opportunities'
    },
    { 
      id: 'graduation', 
      label: 'Academic requirements', 
      icon: 'ribbon-outline', 
      gradient: ['#43e97b', '#38f9d7'],
      description: 'Meet graduation standards'
    },
    { 
      id: 'other', 
      label: 'Personal goals', 
      icon: 'heart-outline', 
      gradient: ['#a8edea', '#fed6e3'],
      description: 'Custom objectives'
    },
  ];

  const scoreRanges = [
    { min: 1400, max: 1450, label: 'Strong Foundation', desc: 'Competitive for most colleges', color: '#10B981', scores: [1400, 1420, 1440, 1450] },
    { min: 1460, max: 1490, label: 'Highly Competitive', desc: 'Opens doors to top universities', color: '#3B82F6', scores: [1460, 1470, 1480, 1490] },
    { min: 1500, max: 1550, label: 'Elite Level', desc: 'Top 1% of test-takers', color: '#8B5CF6', scores: [1500, 1510, 1520, 1530, 1540, 1550] },
    { min: 1560, max: 1600, label: 'Perfect Range', desc: 'Ivy League competitive', color: '#EF4444', scores: [1560, 1570, 1580, 1590, 1600] },
  ];

  const importanceOptions = [
    { 
      id: 'top-priority', 
      label: 'Mission critical', 
      desc: 'My future depends on this score', 
      icon: 'flame-outline', 
      color: '#FF6B6B',
      intensity: 'Maximum focus'
    },
    { 
      id: 'very-important', 
      label: 'High priority', 
      desc: 'Essential for my goals', 
      icon: 'heart-outline', 
      color: '#FFD93D',
      intensity: 'Intensive prep'
    },
    { 
      id: 'fairly-important', 
      label: 'Moderately important', 
      desc: 'Part of my plan', 
      icon: 'star-half-outline', 
      color: '#4ECDC4',
      intensity: 'Steady progress'
    },
    { 
      id: 'not-important', 
      label: 'Nice to achieve', 
      desc: 'Bonus opportunity', 
      icon: 'leaf-outline', 
      color: '#95E1D3',
      intensity: 'Relaxed pace'
    },
  ];

  const dailyGoalOptions = [
    { minutes: 10, label: "10 minutes", desc: "Quick daily review", icon: "time-outline" },
    { minutes: 20, label: "20 minutes", desc: "Solid commitment", icon: "hourglass-outline" },
    { minutes: 30, label: "30 minutes", desc: "Intensive prep", icon: "fitness-outline" },
    { minutes: 45, label: "45 minutes", desc: "Maximum focus", icon: "flame-outline" },
  ];

  const calculateRecommendedDailyGoal = (): number => {
    // Base recommendation on importance and target score
    let baseMinutes = 15; // Default baseline
    
    // Adjust based on importance
    switch (selectedImportance) {
      case 'top-priority':
        baseMinutes = 45;
        break;
      case 'very-important':
        baseMinutes = 30;
        break;
      case 'fairly-important':
        baseMinutes = 20;
        break;
      case 'not-important':
        baseMinutes = 10;
        break;
    }
    
    // Adjust based on target score (higher scores need more practice)
    if (selectedScore) {
      if (selectedScore >= 1550) {
        baseMinutes = Math.max(baseMinutes, 30);
      } else if (selectedScore >= 1500) {
        baseMinutes = Math.max(baseMinutes, 25);
      } else if (selectedScore >= 1450) {
        baseMinutes = Math.max(baseMinutes, 20);
      }
    }
    
    return baseMinutes;
  };

  const getDailyGoalRecommendationText = (minutes: number): string => {
    const weeklyHours = (minutes * 7) / 60;
    
    return `Based on your ${selectedImportance?.replace('-', ' ')} commitment level and ${selectedScore} target score, we recommend ${minutes} minutes daily (${weeklyHours.toFixed(1)} hours/week).`;
  };

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      await completeOnboarding();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      const onboardingData = {
        sat_goal: selectedGoal || undefined,
        target_score: selectedScore || undefined,
        goal_importance: selectedImportance || undefined,
        daily_goal_minutes: selectedDailyGoal || undefined,
        onboarding_completed: true,
      };
      
      // Store onboarding data locally using the local storage service
      const { localStorageService } = await import('../services/localStorageService');
      await localStorageService.saveOnboardingData(onboardingData);

      // Check if user is already logged in
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser) {
        // User is already logged in - save onboarding data directly
        try {
          await onboardingService.updateOnboardingData(onboardingData, currentUser.id);
          // Clear the saved data after processing
          await AsyncStorage.removeItem('onboarding_data');
          console.log('Onboarding completed for logged-in user');
        } catch (onboardingError) {
          console.error('Error processing onboarding data for logged-in user:', onboardingError);
          // If there's an error, keep the data in AsyncStorage for later processing
        }
      } else {
        // User is anonymous - that's perfectly fine! 
        // They can use the app and purchase premium features without authentication
        console.log('Onboarding completed for anonymous user - proceeding to main app');
      }

      // Mark onboarding as just completed to trigger navigation refresh
      await AsyncStorage.setItem('onboarding_just_completed', 'true');
      
      // Small delay to ensure the AsyncStorage write completes, then show paywall
      setTimeout(async () => {
        try {
          // Show the native RevenueCat paywall after onboarding
          console.log('Presenting RevenueCat paywall after onboarding...');
          await revenueCatService.presentPaywall();
          console.log('Paywall completed, navigating to main app');
        } catch (error) {
          console.error('Error presenting paywall:', error);
        } finally {
          // Always navigate to main app regardless of paywall result (soft paywall)
          setIsLoading(false);
          navigation.navigate('Main');
        }
      }, 500);

    } catch (error) {
      console.error('Error saving onboarding data:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedGoal !== null;
      case 1: return selectedScore !== null;
      case 2: return selectedImportance !== null;
      case 3: return selectedDailyGoal !== null;
      case 4: return true;
      default: return false;
    }
  };

  const getScoreSuggestion = (score: number) => {
    // SAT percentile data based on user group percentiles
    const getPercentile = (score: number) => {
      const percentileMap: { [key: number]: number } = {
        1600: 99, 1590: 99, 1580: 99, 1570: 99, 1560: 99, 1550: 99, 1540: 99, 1530: 99,
        1520: 98, 1510: 98, 1500: 98, 1490: 97, 1480: 97, 1470: 96, 1460: 96, 1450: 96,
        1440: 95, 1430: 95, 1420: 94, 1410: 94, 1400: 93, 1390: 93, 1380: 92, 1370: 91,
        1360: 91, 1350: 90, 1340: 89, 1330: 89, 1320: 88, 1310: 87, 1300: 86, 1290: 85,
        1280: 85, 1270: 84, 1260: 83, 1250: 82, 1240: 81, 1230: 80, 1220: 79, 1210: 77,
        1200: 76, 1190: 75, 1180: 74, 1170: 73, 1160: 71, 1150: 70, 1140: 69, 1130: 67,
        1120: 66, 1110: 64, 1100: 63, 1090: 61, 1080: 60, 1070: 58, 1060: 57, 1050: 55,
        1040: 54, 1030: 52, 1020: 51, 1010: 49, 1000: 47
      };
      return percentileMap[score] || 50;
    };

    const percentile = getPercentile(score);
    
    if (score >= 1560) {
      return `Exceptional target! A ${score} puts you in the 99th percentile, meaning you'd score higher than 99% of all SAT test-takers. This opens doors to the most competitive universities worldwide.`;
    } else if (score >= 1500) {
      return `Outstanding goal! A ${score} places you in the ${percentile}th percentile. You'd outperform ${percentile}% of test-takers, making you highly competitive for top-tier colleges.`;
    } else if (score >= 1400) {
      return `Excellent target! A ${score} puts you in the ${percentile}th percentile, meaning you'd score higher than ${percentile}% of students. This significantly strengthens your college applications.`;
    } else if (score >= 1200) {
      return `Solid goal! A ${score} places you in the ${percentile}th percentile. You'd outperform ${percentile}% of test-takers, giving you good options for college admissions.`;
    } else {
      return `Great starting point! A ${score} puts you in the ${percentile}th percentile. With focused preparation, you can build from this foundation to reach even higher scores.`;
    }
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#f8fafc', '#ffffff']}
      style={styles.header}
    >
      <SafeAreaView>
                <View style={styles.headerContent}>
          {currentStep > 0 && currentStep < steps.length - 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={22} color="#475569" />
            </TouchableOpacity>
          )}
          
          <Text style={styles.headerTitle}>Step {currentStep + 1} of {steps.length}</Text>
          
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill, 
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]} 
            />
          </View>
          <View style={styles.progressDots}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index <= currentStep ? styles.progressDotActive : styles.progressDotInactive,
                ]}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  const renderGoalStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>{steps[0].title}</Text>
        <Text style={styles.stepSubtitle}>{steps[0].subtitle}</Text>
      </View>
      
      <View style={styles.optionsContainer}>
        {goalOptions.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.modernOptionCard,
              selectedGoal === option.id && styles.modernOptionCardSelected,
            ]}
            onPress={() => setSelectedGoal(option.id)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={selectedGoal === option.id ? ['#1CB0F6', '#1899D6'] : ['#ffffff', '#f8fafc']}
              style={styles.optionGradient}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionLeft}>
                  <View style={[
                    styles.optionIconWrapper,
                    selectedGoal === option.id && styles.optionIconWrapperSelected
                  ]}>
                    <Ionicons 
                      name={option.icon as any} 
                      size={24} 
                      color={selectedGoal === option.id ? '#ffffff' : '#1CB0F6'} 
                    />
                  </View>
                  <View style={styles.optionTextWrapper}>
                    <Text style={[
                      styles.optionLabel,
                      selectedGoal === option.id && styles.optionLabelSelected
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.optionDescription,
                      selectedGoal === option.id && styles.optionDescriptionSelected
                    ]}>
                      {option.description}
                    </Text>
                  </View>
                </View>
                {selectedGoal === option.id && (
                  <View style={styles.checkmarkWrapper}>
                    <Ionicons name="checkmark-circle" size={28} color="#ffffff" />
                  </View>
                )}
              </View>
                          </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderScoreStep = () => {
    const allScores = [1200, 1250, 1300, 1350, 1400, 1450, 1480, 1490, 1500, 1510, 1520, 1530, 1540, 1550, 1560, 1570, 1580, 1590, 1600];
    
    return (
      <Animated.View 
        style={[
          styles.stepContainer,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>{steps[1].title}</Text>
          <Text style={styles.stepSubtitle}>{steps[1].subtitle}</Text>
        </View>
        
        <View style={styles.optionsContainer}>
          <ScrollView 
            style={styles.scoreScrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.scoreList}>
              {allScores.map((score) => (
                <TouchableOpacity
                  key={score}
                  style={[
                    styles.scoreListItem,
                    selectedScore === score && styles.scoreListItemSelected,
                  ]}
                  onPress={() => setSelectedScore(score)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.scoreListText,
                    selectedScore === score && styles.scoreListTextSelected,
                  ]}>
                    {score}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          {selectedScore && (
            <Animated.View style={styles.suggestion}>
              <LinearGradient
                colors={['#f0f9ff', '#e0f2fe']}
                style={styles.suggestionGradient}
              >
                <View style={styles.suggestionHeader}>
                  <Ionicons name="bulb-outline" size={20} color="#0ea5e9" />
                  <Text style={styles.suggestionLabel}>PERSONALIZED INSIGHT</Text>
                </View>
                <Text style={styles.suggestionText}>
                  {getScoreSuggestion(selectedScore)}
                </Text>
              </LinearGradient>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderImportanceStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>{steps[2].title}</Text>
        <Text style={styles.stepSubtitle}>{steps[2].subtitle}</Text>
      </View>
      
      <View style={styles.optionsContainer}>
        {importanceOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.modernOptionCard,
              selectedImportance === option.id && styles.modernOptionCardSelected,
            ]}
            onPress={() => setSelectedImportance(option.id)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={selectedImportance === option.id ? ['#1CB0F6', '#1899D6'] : ['#ffffff', '#f8fafc']}
              style={styles.optionGradient}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionLeft}>
                  <View style={[
                    styles.optionIconWrapper,
                    selectedImportance === option.id && styles.optionIconWrapperSelected,
                    { backgroundColor: selectedImportance === option.id ? 'rgba(255,255,255,0.2)' : `${option.color}20` }
                  ]}>
                    <Ionicons 
                      name={option.icon as any} 
                      size={24} 
                      color={selectedImportance === option.id ? '#ffffff' : option.color} 
                    />
                  </View>
                  <View style={styles.optionTextWrapper}>
                    <Text style={[
                      styles.optionLabel,
                      selectedImportance === option.id && styles.optionLabelSelected
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.optionDescription,
                      selectedImportance === option.id && styles.optionDescriptionSelected
                    ]}>
                      {option.desc}
                    </Text>
                    <Text style={[
                      styles.intensityText,
                      selectedImportance === option.id && styles.intensityTextSelected
                    ]}>
                      {option.intensity}
                    </Text>
                  </View>
                </View>
                {selectedImportance === option.id && (
                  <View style={styles.checkmarkWrapper}>
                    <Ionicons name="checkmark-circle" size={28} color="#ffffff" />
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderDailyGoalStep = () => {
    const recommendedMinutes = calculateRecommendedDailyGoal();
    
    // Auto-select recommendation if not already selected
    if (selectedDailyGoal === null && recommendedMinutes) {
      setSelectedDailyGoal(recommendedMinutes);
    }
    
    return (
      <Animated.View 
        style={[
          styles.stepContainer,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>{steps[3].title}</Text>
          <Text style={styles.stepSubtitle}>{steps[3].subtitle}</Text>
        </View>
        
        <ScrollView 
          style={styles.optionsContainer}
          contentContainerStyle={styles.dailyGoalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Recommendation Card */}
          <View style={styles.recommendationCard}>
            <LinearGradient
              colors={['#f0f9ff', '#e0f2fe']}
              style={styles.recommendationGradient}
            >
              <View style={styles.recommendationHeader}>
                <Ionicons name="bulb-outline" size={18} color="#0ea5e9" />
                <Text style={styles.recommendationLabel}>RECOMMENDED FOR YOU</Text>
              </View>
              <Text style={styles.recommendationText}>
                {getDailyGoalRecommendationText(recommendedMinutes)}
              </Text>
            </LinearGradient>
          </View>
          
          {/* Daily Goal Options */}
          <Text style={styles.optionsTitle}>Choose your daily commitment:</Text>
          <View style={styles.dailyGoalGrid}>
            {dailyGoalOptions.map((option) => (
              <TouchableOpacity
                key={option.minutes}
                style={[
                  styles.dailyGoalOption,
                  selectedDailyGoal === option.minutes && styles.dailyGoalOptionSelected,
                  option.minutes === recommendedMinutes && styles.dailyGoalOptionRecommended,
                ]}
                onPress={() => setSelectedDailyGoal(option.minutes)}
                activeOpacity={0.7}
              >
                <View style={styles.dailyGoalContent}>
                  <View style={[
                    styles.dailyGoalIconWrapper,
                    selectedDailyGoal === option.minutes && styles.dailyGoalIconWrapperSelected
                  ]}>
                    <Ionicons 
                      name={option.icon as any} 
                      size={18} 
                      color={selectedDailyGoal === option.minutes ? '#ffffff' : '#1CB0F6'} 
                    />
                  </View>
                  <Text style={[
                    styles.dailyGoalLabel,
                    selectedDailyGoal === option.minutes && styles.dailyGoalLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[
                    styles.dailyGoalDesc,
                    selectedDailyGoal === option.minutes && styles.dailyGoalDescSelected
                  ]}>
                    {option.desc}
                  </Text>
                  {option.minutes === recommendedMinutes && selectedDailyGoal !== option.minutes && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    );
  };



  const renderCompletionStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.completionContainer}>
        <View style={styles.successIllustration}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/ninja.png')} 
              style={styles.ninjaLogo}
              resizeMode="contain"
            />
          </View>
        </View>
        
        <Text style={styles.completionTitle}>You're all set!</Text>
        <Text style={styles.completionSubtitle}>Ready to start practicing</Text>
        
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['#ffffff', '#f8fafc']}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryTitle}>Your Personalized Plan</Text>
            {selectedGoal && (
              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="flag-outline" size={16} color="#1CB0F6" />
                </View>
                <View style={styles.summaryTextWrapper}>
                  <Text style={styles.summaryLabel}>Goal</Text>
                  <Text style={styles.summaryText}>
                    {goalOptions.find(g => g.id === selectedGoal)?.label.split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ')}
                  </Text>
                </View>
              </View>
            )}
            {selectedScore && (
              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="trending-up" size={16} color="#1CB0F6" />
                </View>
                <View style={styles.summaryTextWrapper}>
                  <Text style={styles.summaryLabel}>Target Score</Text>
                  <Text style={styles.summaryText}>{selectedScore}</Text>
                </View>
              </View>
            )}
            {selectedImportance && (
              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="flame" size={16} color="#1CB0F6" />
                </View>
                <View style={styles.summaryTextWrapper}>
                  <Text style={styles.summaryLabel}>Commitment</Text>
                  <Text style={styles.summaryText}>
                    {importanceOptions.find(i => i.id === selectedImportance)?.label.split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ')}
                  </Text>
                </View>
              </View>
            )}
            {selectedDailyGoal && (
              <View style={[styles.summaryItem, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="time" size={16} color="#1CB0F6" />
                </View>
                <View style={styles.summaryTextWrapper}>
                  <Text style={styles.summaryLabel}>Daily Goal</Text>
                  <Text style={styles.summaryText}>{selectedDailyGoal} minutes</Text>
                </View>
              </View>
            )}
          </LinearGradient>
        </View>
      </View>
    </Animated.View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0: return renderGoalStep();
      case 1: return renderScoreStep();
      case 2: return renderImportanceStep();
      case 3: return renderDailyGoalStep();
      case 4: return renderCompletionStep();
      default: return null;
    }
  };



  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <View style={styles.content}>
        {renderStep()}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !canProceed() && styles.continueButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!canProceed() || isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={!canProceed() || isLoading ? ['#e2e8f0', '#f1f5f9'] : ['#1CB0F6', '#1899D6']}
            style={styles.continueButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[
                styles.continueButtonText,
                (!canProceed() || isLoading) && { color: '#64748b' }
              ]}>
                {currentStep === steps.length - 1 ? 'Start Practicing' : 'Continue'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1CB0F6',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 44,
  },
  progressSection: {
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1CB0F6',
    borderRadius: 3,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    backgroundColor: '#1CB0F6',
  },
  progressDotInactive: {
    backgroundColor: '#cbd5e1',
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepHeader: {
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  optionsContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  scoreScrollContainer: {
    flex: 1,
  },
  modernOptionCard: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  modernOptionCardSelected: {
    shadowColor: '#1CB0F6',
    shadowOpacity: 0.2,
    elevation: 8,
  },
  optionGradient: {
    padding: 18,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionIconWrapperSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  optionTextWrapper: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },
  optionLabelSelected: {
    color: '#ffffff',
  },
  optionDescription: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  optionDescriptionSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  intensityText: {
    fontSize: 12,
    color: '#1CB0F6',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  intensityTextSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  checkmarkWrapper: {
    marginLeft: 16,
  },
  scoreList: {
    gap: 2,
    marginBottom: 32,
  },
  scoreListItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  scoreListItemSelected: {
    backgroundColor: '#1CB0F6',
  },
  scoreListText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  scoreListTextSelected: {
    color: '#ffffff',
  },
  suggestion: {
    borderRadius: 20,
    marginTop: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    overflow: 'hidden',
  },
  suggestionGradient: {
    padding: 24,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0ea5e9',
    marginLeft: 8,
    letterSpacing: 1,
  },
  suggestionText: {
    fontSize: 16,
    color: '#0f172a',
    lineHeight: 24,
    fontWeight: '600',
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 24,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  successIllustration: {
    marginBottom: 16,
    alignItems: 'center',
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1CB0F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  logoContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ninjaLogo: {
    width: 80,
    height: 80,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 34,
  },
  completionSubtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    fontWeight: '500',
    paddingHorizontal: 16,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 0,
  },
  summaryGradient: {
    padding: 24,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ebf8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryTextWrapper: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '600',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    paddingTop: 16,
    backgroundColor: '#ffffff',
  },
  continueButton: {
    borderRadius: 20,
    shadowColor: '#1CB0F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonDisabled: {
    shadowOpacity: 0.05,
    elevation: 2,
  },
  continueButtonGradient: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    marginTop: 4,
  },
  recommendationCard: {
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  recommendationGradient: {
    padding: 16,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0ea5e9',
    marginLeft: 8,
    letterSpacing: 1,
  },
  recommendationText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
    fontWeight: '600',
  },
  dailyGoalScrollContent: {
    paddingBottom: 24,
  },
  dailyGoalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  dailyGoalOption: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dailyGoalOptionSelected: {
    backgroundColor: '#1CB0F6',
    borderColor: '#1CB0F6',
    shadowColor: '#1CB0F6',
    shadowOpacity: 0.15,
    elevation: 4,
  },
  dailyGoalOptionRecommended: {
    borderColor: '#0ea5e9',
    borderWidth: 2,
  },
  dailyGoalContent: {
    alignItems: 'center',
  },
  dailyGoalIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  dailyGoalIconWrapperSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dailyGoalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
  },
  dailyGoalLabelSelected: {
    color: '#ffffff',
  },
  dailyGoalDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  dailyGoalDescSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  recommendedBadge: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  recommendedBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

});

export default OnboardingScreen; 