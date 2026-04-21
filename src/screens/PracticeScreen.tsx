import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { questionGenerationService, QuestionLimitReachedError } from '../services/questionGenerationService';
import { questionService } from '../services/questions';
import { questionLimitService } from '../services/questionLimitService';
import { useAuth } from '../hooks/useAuth';

const { width } = Dimensions.get('window');

const PracticeScreen = ({ navigation, route }: any) => {
  const { user } = useAuth();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedSubdomain, setSelectedSubdomain] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  // Handle route parameters from navigation
  useEffect(() => {
    if (route?.params) {
      const { section, domain } = route.params;
      if (section) {
        setSelectedSection(section);
      }
      if (domain) {
        setSelectedDomain(domain);
      }
    }
  }, [route?.params]);

  // Load user progress data
  const loadProgress = async () => {
    setIsLoadingProgress(true);
    try {
      const progress = await questionService.getDetailedProgressForUser(user?.id);
      setUserProgress(progress);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  useEffect(() => {
    loadProgress();
  }, [user]);

  // Refresh progress data when screen comes into focus (after returning from practice)
  useFocusEffect(
    React.useCallback(() => {
      loadProgress();
    }, [user])
  );

  // Set default difficulty to 'any' when domain is selected
  useEffect(() => {
    if (selectedDomain && !selectedDifficulty) {
      setSelectedDifficulty('any');
    }
  }, [selectedDomain, selectedDifficulty]);

  const sections = [
    {
      id: 'reading-writing',
      name: 'Reading & Writing',
      icon: 'book',
      gradient: ['#1CB0F6', '#1899D6'] as const,
      backgroundColor: '#E3F2FD',
      description: 'Evidence-Based Reading and Writing',
      domains: 4
    },
    {
      id: 'math',
      name: 'Math',
      icon: 'calculator',
      gradient: ['#58CC02', '#4CAF50'] as const,
      backgroundColor: '#E8F5E8',
      description: 'Calculator and No Calculator',
      domains: 4
    }
  ];

  const readingWritingDomains = [
    {
      id: 'information-ideas',
      name: 'Information and Ideas',
      percentage: 26,
      icon: 'information-circle',
      backgroundColor: '#E3F2FD',
      iconColor: '#1CB0F6',
      subdomains: [
        'Central Ideas and Details',
        'Command of Evidence: Quantitative',
        'Command of Evidence: Textual',
        'Inference'
      ]
    },
    {
      id: 'craft-structure',
      name: 'Craft and Structure',
      percentage: 28,
      icon: 'construct',
      backgroundColor: '#E8F5E8',
      iconColor: '#58CC02',
      subdomains: [
        'Cross-Text Connections',
        'Text Structure and Purpose',
        'Words in Context'
      ]
    },
    {
      id: 'expression-ideas',
      name: 'Expression of Ideas',
      percentage: 20,
      icon: 'bulb',
      backgroundColor: '#FFF3E0',
      iconColor: '#FF9800',
      subdomains: [
        'Rhetorical Synthesis',
        'Transitions'
      ]
    },
    {
      id: 'standard-english',
      name: 'Standard English Conventions',
      percentage: 26,
      icon: 'text',
      backgroundColor: '#F3E5F5',
      iconColor: '#9C27B0',
      subdomains: [
        'Boundaries',
        'Form, Structure, Sense'
      ]
    }
  ];

  const mathDomains = [
    {
      id: 'algebra',
      name: 'Algebra',
      percentage: 35,
      icon: 'trending-up',
      backgroundColor: '#E8F5E8',
      iconColor: '#58CC02',
      subdomains: [
        'Linear equations in 1 variable',
        'Linear equations in 2 variables',
        'Linear functions',
        'Systems of 2 linear equations in 2 variables',
        'Linear inequalities in 1 or 2 variables'
      ]
    },
    {
      id: 'advanced-math',
      name: 'Advanced Math',
      percentage: 35,
      icon: 'function',
      backgroundColor: '#FFF3E0',
      iconColor: '#FF9800',
      subdomains: [
        'Equivalent expressions',
        'Nonlinear equations in 1 variable and systems of equations in 2 variables',
        'Nonlinear functions'
      ]
    },
    {
      id: 'problem-solving-data',
      name: 'Problem-Solving and Data Analysis',
      percentage: 15,
      icon: 'analytics',
      backgroundColor: '#E3F2FD',
      iconColor: '#1CB0F6',
      subdomains: [
        'Ratios, rates, proportional relationships, and units',
        'Percentages',
        'One-variable data: distributions and measures of center and spread',
        'Two-variable data: models and scatterplots',
        'Probability and conditional probability',
        'Inference from sample statistics and margin of error',
        'Evaluating statistical claims: observational studies and experiments'
      ]
    },
    {
      id: 'geometry-trigonometry',
      name: 'Geometry and Trigonometry',
      percentage: 15,
      icon: 'triangle',
      backgroundColor: '#F3E5F5',
      iconColor: '#9C27B0',
      subdomains: [
        'Area and volume formulas',
        'Lines, angles, and triangles',
        'Right triangles and trigonometry',
        'Circles'
      ]
    }
  ];

  const difficulties = [
    { 
      id: 'any', 
      name: 'Any Difficulty', 
      backgroundColor: '#FFFFFF',
      iconColor: '#1CB0F6',
      icon: 'shuffle',
      description: 'Mix of all difficulty levels'
    },
    { 
      id: 'easy', 
      name: 'Easy', 
      backgroundColor: '#FFFFFF',
      iconColor: '#58CC02',
      icon: 'leaf',
      description: 'Perfect for building confidence'
    },
    { 
      id: 'medium', 
      name: 'Medium', 
      backgroundColor: '#FFFFFF',
      iconColor: '#FF9800',
      icon: 'flame',
      description: 'Challenge yourself'
    },
    { 
      id: 'hard', 
      name: 'Hard', 
      backgroundColor: '#FFFFFF',
      iconColor: '#F44336',
      icon: 'flash',
      description: 'Test your mastery'
    },
  ];

  // Function to get random subtopic when "All Subtopics" is selected
  const getRandomSubtopic = () => {
    if (selectedSubdomain) return selectedSubdomain; // If specific subtopic is selected, use it
    
    if (selectedDomain === 'all') {
      // If all domains selected, pick from any domain
      const allDomains = getCurrentDomains();
      const randomDomain = allDomains[Math.floor(Math.random() * allDomains.length)];
      const randomIndex = Math.floor(Math.random() * randomDomain.subdomains.length);
      return randomDomain.subdomains[randomIndex];
    }
    
    const currentDomainData = getCurrentDomains().find(d => d.id === selectedDomain);
    
    if (currentDomainData && currentDomainData.subdomains.length > 0) {
      const randomIndex = Math.floor(Math.random() * currentDomainData.subdomains.length);
      return currentDomainData.subdomains[randomIndex];
    }
    
    return undefined;
  };

  // Function to get random domain and topic when "All Domains" is selected
  const getRandomDomainData = () => {
    if (selectedDomain === 'all') {
      const allDomains = getCurrentDomains();
      return allDomains[Math.floor(Math.random() * allDomains.length)];
    }
    return getCurrentDomains().find(d => d.id === selectedDomain);
  };

  // Function to get random difficulty when "Any Difficulty" is selected
  const getRandomDifficulty = () => {
    if (selectedDifficulty === 'any') {
      const difficultyOptions = ['easy', 'medium', 'hard'];
      return difficultyOptions[Math.floor(Math.random() * difficultyOptions.length)] as 'easy' | 'medium' | 'hard';
    }
    return selectedDifficulty as 'easy' | 'medium' | 'hard';
  };

  const handleQuickPractice = async (sectionId: string) => {
    setIsGeneratingQuestions(true);
    
    try {
      // Check question limit before proceeding
      const limitStatus = await questionLimitService.checkQuestionLimit(user?.id);
      
      if (!limitStatus.canGenerate && !limitStatus.isPremium) {
        setIsGeneratingQuestions(false);
        
        // Show paywall
        const upgradedToPremium = await questionLimitService.presentPaywall();
        
        if (!upgradedToPremium) {
          // User didn't upgrade, show limit reached message
          Alert.alert(
            'Daily Limit Reached',
            `You've reached your daily limit of ${limitStatus.dailyLimit} questions. Upgrade to Premium for unlimited questions and access to all features.`,
            [{ text: 'OK' }]
          );
          return;
        }
        // If user upgraded, continue with question generation
      }

      // Get default domain and topic for quick practice
      const domains = sectionId === 'reading-writing' ? readingWritingDomains : mathDomains;
      const randomDomain = domains[Math.floor(Math.random() * domains.length)];
      const randomSubtopic = randomDomain.subdomains[Math.floor(Math.random() * randomDomain.subdomains.length)];
      
      // For quick practice, use "any" difficulty and pick a random one for the first question
      const difficultyOptions = ['easy', 'medium', 'hard'];
      const randomDifficulty = difficultyOptions[Math.floor(Math.random() * difficultyOptions.length)] as 'easy' | 'medium' | 'hard';
      
      // Generate the first question with random difficulty
      const response = await questionGenerationService.generateQuestions({
        section: sectionId as 'math' | 'reading-writing',
        topic: randomDomain.name,
        subtopic: randomSubtopic,
        difficulty: randomDifficulty,
        count: 1
      });

      // Navigate to question practice screen with generation parameters
      navigation.navigate('QuestionPractice', {
        section: sectionId,
        domain: randomDomain.id,
        subdomain: randomSubtopic,
        difficulty: 'any',
        generationParams: {
          section: sectionId as 'math' | 'reading-writing',
          topic: randomDomain.name,
          subtopic: randomSubtopic,
          difficulty: randomDifficulty,
        },
        firstQuestion: response.questions[0],
        initialUsage: response.usage,
        isQuickPractice: true
      });

    } catch (error) {
      console.error('Error generating questions:', error);
      
      if (error instanceof QuestionLimitReachedError) {
        // Handle limit reached error specifically
        const upgradedToPremium = await questionLimitService.presentPaywall();
        
        if (!upgradedToPremium) {
          Alert.alert(
            'Daily Limit Reached',
            error.message,
            [{ text: 'OK' }]
          );
        } else {
          // If user upgraded, retry the generation
          setIsGeneratingQuestions(false);
          return handleQuickPractice(sectionId);
        }
      } else {
        // Show user-friendly error message for other errors
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate questions. Please try again.';
        
        Alert.alert(
          'Question Generation Failed',
          errorMessage,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: () => handleQuickPractice(sectionId) }
          ]
        );
      }
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleStartPractice = async () => {
    if (!selectedSection || !selectedDomain || !selectedDifficulty) {
      Alert.alert('Missing Selection', 'Please select all required options to continue.');
      return;
    }

    setIsGeneratingQuestions(true);
    
    try {
      // Check question limit before proceeding
      const limitStatus = await questionLimitService.checkQuestionLimit(user?.id);
      
      if (!limitStatus.canGenerate && !limitStatus.isPremium) {
        setIsGeneratingQuestions(false);
        
        // Show paywall
        const upgradedToPremium = await questionLimitService.presentPaywall();
        
        if (!upgradedToPremium) {
          // User didn't upgrade, show limit reached message
          Alert.alert(
            'Daily Limit Reached',
            `You've reached your daily limit of ${limitStatus.dailyLimit} questions. Upgrade to Premium for unlimited questions and access to all features.`,
            [{ text: 'OK' }]
          );
          return;
        }
        // If user upgraded, continue with question generation
      }

      const domainData = getRandomDomainData();
      
      // Generate the first question to validate the setup
      const finalDifficulty = getRandomDifficulty();
      const response = await questionGenerationService.generateQuestions({
        section: selectedSection as 'math' | 'reading-writing',
        topic: domainData?.name || selectedDomain,
        subtopic: getRandomSubtopic(),
        difficulty: finalDifficulty,
        count: 1
      });

      // Navigate to question practice screen with generation parameters
      navigation.navigate('QuestionPractice', {
        section: selectedSection,
        domain: selectedDomain,
        subdomain: selectedSubdomain,
        difficulty: selectedDifficulty,
        generationParams: {
          section: selectedSection as 'math' | 'reading-writing',
          topic: domainData?.name || selectedDomain,
          subtopic: selectedSubdomain, // Keep original selection for header display
          difficulty: finalDifficulty, // Use the resolved difficulty, not the selected one
        },
        firstQuestion: response.questions[0],
        initialUsage: response.usage
      });

    } catch (error) {
      console.error('Error generating questions:', error);
      
      if (error instanceof QuestionLimitReachedError) {
        // Handle limit reached error specifically
        const upgradedToPremium = await questionLimitService.presentPaywall();
        
        if (!upgradedToPremium) {
          Alert.alert(
            'Daily Limit Reached',
            error.message,
            [{ text: 'OK' }]
          );
        } else {
          // If user upgraded, retry the generation
          setIsGeneratingQuestions(false);
          return handleStartPractice();
        }
      } else {
        // Show user-friendly error message for other errors
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate questions. Please try again.';
        
        Alert.alert(
          'Question Generation Failed',
          errorMessage,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: handleStartPractice }
          ]
        );
      }
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const resetToSections = () => {
    setSelectedSection(null);
    setSelectedDomain(null);
    setSelectedSubdomain(null);
    setSelectedDifficulty(null);
  };

  const resetToDomains = () => {
    setSelectedDomain(null);
    setSelectedSubdomain(null);
    setSelectedDifficulty(null);
  };

  const getCurrentDomains = () => {
    return selectedSection === 'reading-writing' ? readingWritingDomains : mathDomains;
  };

  // Helper function to get accuracy percentage for a domain
  const getDomainAccuracy = (section: string, domainId: string): number => {
    if (!userProgress || !userProgress[section] || !userProgress[section][domainId]) {
      return 0;
    }
    const domain = userProgress[section][domainId];
    return domain.total > 0 ? Math.round((domain.correct / domain.total) * 100) : 0;
  };

  // Helper function to format accuracy display
  const formatAccuracy = (accuracy: number): string => {
    return accuracy > 0 ? `${accuracy}%` : '--';
  };

  // Helper function to get subdomain accuracy
  const getSubdomainAccuracy = (section: string, domainId: string, subdomainName: string): number => {
    if (!userProgress || !userProgress[section] || !userProgress[section][domainId]) {
      return 0;
    }
    
    const domainData = userProgress[section][domainId];
    
    // Check if we have subdomain-specific data
    if (domainData.subdomains && domainData.subdomains[subdomainName]) {
      const subdomainData = domainData.subdomains[subdomainName];
      return subdomainData.total > 0 ? Math.round((subdomainData.correct / subdomainData.total) * 100) : 0;
    }
    
    // Fallback to domain accuracy if no specific subdomain data
    return getDomainAccuracy(section, domainId);
  };

  // Helper function to get overall section accuracy
  const getSectionAccuracy = (sectionId: string): number => {
    if (!userProgress || !userProgress[sectionId]) {
      return 0;
    }
    
    let totalCorrect = 0;
    let totalQuestions = 0;
    
    const sectionData = userProgress[sectionId];
    Object.values(sectionData).forEach((domainData: any) => {
      if (domainData && typeof domainData === 'object' && 'correct' in domainData && 'total' in domainData) {
        totalCorrect += domainData.correct;
        totalQuestions += domainData.total;
      }
    });
    
    return totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  };

  const selectedDomainData = getCurrentDomains().find(d => d.id === selectedDomain);
  const selectedSectionData = sections.find(s => s.id === selectedSection);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!selectedSection ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose SAT Section</Text>
            <Text style={styles.sectionDescription}>
              Select the area you'd like to practice today
            </Text>
            
            <View style={styles.sectionsContainer}>
              {sections.map((section) => {
                const sectionAccuracy = getSectionAccuracy(section.id);
                return (
                  <View key={section.id} style={styles.sectionCard}>
                    <View style={[styles.sectionCardBackground, { backgroundColor: section.backgroundColor }]}>
                      <View style={styles.sectionCardHeader}>
                        <View style={styles.sectionIconContainer}>
                          <Ionicons name={section.icon as any} size={32} color={section.gradient[0]} />
                        </View>
                        <View style={styles.sectionHeaderRight}>
                          <View style={styles.sectionAccuracyBadge}>
                            <Text style={styles.sectionAccuracyLabel}>ACCURACY</Text>
                            <Text style={[styles.sectionAccuracyText, { color: section.gradient[0] }]}>
                              {formatAccuracy(sectionAccuracy)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text style={styles.sectionName}>{section.name}</Text>
                      <Text style={styles.sectionDescriptionText}>{section.description}</Text>
                      
                      <View style={styles.practiceButtonsContainer}>
                        <TouchableOpacity
                          style={[styles.quickPracticeButton, { backgroundColor: section.gradient[0] }]}
                          onPress={() => handleQuickPractice(section.id)}
                          activeOpacity={0.8}
                          disabled={isGeneratingQuestions}
                        >
                          {isGeneratingQuestions ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="flash" size={16} color="#fff" />
                              <Text style={styles.quickPracticeText}>Quick Start</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.customPracticeButton, { backgroundColor: section.gradient[0], borderColor: section.gradient[0] }]}
                          onPress={() => setSelectedSection(section.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="settings" size={16} color="#fff" />
                          <Text style={[styles.customPracticeText, { color: '#fff' }]}>Custom</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
              );
              })}
            </View>
          </View>
        ) : !selectedDomain ? (
          <View style={styles.section}>
            <TouchableOpacity style={styles.backButtonInline} onPress={resetToSections}>
              <Ionicons name="chevron-back" size={20} color="#1CB0F6" />
              <Text style={styles.backButtonText}>Back to Sections</Text>
            </TouchableOpacity>
            
            <Text style={styles.sectionTitle}>
              Custom {selectedSectionData?.name} Practice
            </Text>
            <Text style={styles.sectionDescription}>
              Choose your focus area for the practice session
            </Text>
            
            {/* Quick Options */}
            <View style={styles.quickOptionsSection}>
              <Text style={styles.quickOptionsTitle}>Quick Options</Text>
              <View style={styles.quickOptionsList}>
                <TouchableOpacity
                  style={[
                    styles.quickOptionCard,
                    selectedDomain === 'all' && styles.selectedQuickOptionCard,
                  ]}
                  onPress={() => setSelectedDomain('all')}
                  activeOpacity={0.8}
                >
                                        <View style={[
                        styles.quickOptionContent,
                        { backgroundColor: selectedDomain === 'all' ? '#1CB0F6' : '#FFFFFF' }
                      ]}>
                        <Ionicons 
                          name="layers" 
                          size={20} 
                          color={selectedDomain === 'all' ? '#fff' : '#1CB0F6'} 
                        />
                        <Text style={[
                          styles.quickOptionName,
                          { color: selectedDomain === 'all' ? '#fff' : '#1A1A1A' }
                        ]}>
                          All Topics
                        </Text>
                      </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.quickOptionCard,
                    selectedDomain === 'weak-areas' && styles.selectedQuickOptionCard,
                  ]}
                  onPress={() => setSelectedDomain('weak-areas')}
                  activeOpacity={0.8}
                >
                                        <View style={[
                        styles.quickOptionContent,
                        { backgroundColor: selectedDomain === 'weak-areas' ? '#F44336' : '#FFFFFF' }
                      ]}>
                        <Ionicons 
                          name="trending-down" 
                          size={20} 
                          color={selectedDomain === 'weak-areas' ? '#fff' : '#F44336'} 
                        />
                        <Text style={[
                          styles.quickOptionName,
                          { color: selectedDomain === 'weak-areas' ? '#fff' : '#1A1A1A' }
                        ]}>
                          Focus on Weak Areas
                        </Text>
                      </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Specific Topics - Simplified */}
            <View style={styles.domainsSection}>
              <Text style={styles.quickOptionsTitle}>Specific Topics</Text>
                          <View style={styles.simpleDomainGrid}>
              {getCurrentDomains().map((domain) => {
                const accuracy = getDomainAccuracy(selectedSection || '', domain.id);
                return (
                  <TouchableOpacity
                    key={domain.id}
                    style={[
                      styles.simpleDomainCard,
                      selectedDomain === domain.id && styles.selectedSimpleDomainCard,
                    ]}
                    onPress={() => setSelectedDomain(domain.id)}
                    activeOpacity={0.8}
                  >
                                          <View style={[
                        styles.simpleDomainContent,
                        { backgroundColor: selectedDomain === domain.id ? domain.iconColor : '#FFFFFF' }
                      ]}>
                        <View style={styles.simpleDomainHeader}>
                          <Ionicons 
                            name={domain.icon as any} 
                            size={20} 
                            color={selectedDomain === domain.id ? '#fff' : domain.iconColor} 
                          />
                          <Text style={[
                            styles.simpleDomainName,
                            { color: selectedDomain === domain.id ? '#fff' : '#1A1A1A' }
                          ]}>
                            {domain.name}
                          </Text>
                        </View>
                      <View style={styles.simpleDomainAccuracy}>
                        <Text style={[
                          styles.simpleDomainAccuracyLabel,
                          { color: selectedDomain === domain.id ? 'rgba(255, 255, 255, 0.8)' : '#888' }
                        ]}>
                          Accuracy
                        </Text>
                        <Text style={[
                          styles.simpleDomainAccuracyText,
                          { color: selectedDomain === domain.id ? '#fff' : domain.iconColor }
                        ]}>
                          {formatAccuracy(accuracy)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            </View>
          </View>
        ) : (selectedDomain === 'all' || selectedDomain === 'weak-areas') ? (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.backButtonInline} 
              onPress={() => setSelectedDomain(null)}
            >
              <Ionicons name="chevron-back" size={20} color="#1CB0F6" />
              <Text style={styles.backButtonText}>Back to Topics</Text>
            </TouchableOpacity>
            
            <Text style={styles.sectionTitle}>
              {selectedDomain === 'all' ? 'All Topics' : 'Focus on Weak Areas'}
            </Text>
            <Text style={styles.sectionDescription}>
              Choose your preferred difficulty level
            </Text>
            
            {/* Any Difficulty Bar */}
            <TouchableOpacity
              style={[
                styles.anyDifficultyBar,
                selectedDifficulty === 'any' && styles.selectedAnyDifficultyBar,
              ]}
              onPress={() => setSelectedDifficulty('any')}
              activeOpacity={0.8}
            >
              <View style={[
                styles.anyDifficultyContent,
                { backgroundColor: selectedDifficulty === 'any' ? '#1CB0F6' : '#FFFFFF' }
              ]}>
                <View style={styles.anyDifficultyLeft}>
                  <Ionicons 
                    name="shuffle" 
                    size={24} 
                    color={selectedDifficulty === 'any' ? '#fff' : '#1CB0F6'} 
                  />
                  <View style={styles.anyDifficultyTextContainer}>
                    <Text style={[
                      styles.anyDifficultyName,
                      { color: selectedDifficulty === 'any' ? '#fff' : '#1A1A1A' }
                    ]}>
                      Any Difficulty
                    </Text>
                    <Text style={[
                      styles.anyDifficultyDescription,
                      { color: selectedDifficulty === 'any' ? 'rgba(255, 255, 255, 0.8)' : '#777' }
                    ]}>
                      Mix of all difficulty levels
                    </Text>
                  </View>
                </View>
                {selectedDifficulty === 'any' && (
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            {/* Specific Difficulty Bars */}
            <View style={styles.specificDifficultiesSection}>
              <Text style={styles.specificDifficultiesTitle}>Specific Levels</Text>
              <View style={styles.difficultyBarsContainer}>
                {difficulties.filter(d => d.id !== 'any').map((difficulty) => (
                  <TouchableOpacity
                    key={difficulty.id}
                    style={[
                      styles.difficultyBar,
                      selectedDifficulty === difficulty.id && styles.selectedDifficultyBar,
                    ]}
                    onPress={() => setSelectedDifficulty(difficulty.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.difficultyBarContent,
                      { 
                        backgroundColor: selectedDifficulty === difficulty.id 
                          ? difficulty.iconColor 
                          : difficulty.backgroundColor 
                      }
                    ]}>
                      <View style={styles.difficultyBarLeft}>
                        <Ionicons 
                          name={difficulty.icon as any} 
                          size={20} 
                          color={selectedDifficulty === difficulty.id ? '#fff' : difficulty.iconColor} 
                        />
                        <Text style={[
                          styles.difficultyBarName,
                          { color: selectedDifficulty === difficulty.id ? '#fff' : '#1A1A1A' }
                        ]}>
                          {difficulty.name}
                        </Text>
                      </View>
                      {selectedDifficulty === difficulty.id && (
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : selectedDomain && selectedDomain !== 'all' && selectedDomain !== 'weak-areas' && !selectedSubdomain ? (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.backButtonInline} 
              onPress={() => setSelectedDomain(null)}
            >
              <Ionicons name="chevron-back" size={20} color="#1CB0F6" />
              <Text style={styles.backButtonText}>Back to Topics</Text>
            </TouchableOpacity>
            
            <Text style={styles.sectionTitle}>
              {getCurrentDomains().find(d => d.id === selectedDomain)?.name}
            </Text>
            <Text style={styles.sectionDescription}>
              Choose a specific subtopic or practice all areas
            </Text>
            
            {/* All Subtopics Option */}
            <View style={styles.allSubtopicsSection}>
              <TouchableOpacity
                style={[
                  styles.quickOptionCard,
                  selectedSubdomain === 'all' && styles.selectedQuickOptionCard,
                ]}
                onPress={() => setSelectedSubdomain('all')}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.quickOptionContent,
                  { backgroundColor: selectedSubdomain === 'all' ? '#1CB0F6' : '#FFFFFF' }
                ]}>
                  <Ionicons 
                    name="layers" 
                    size={20} 
                    color={selectedSubdomain === 'all' ? '#fff' : '#1CB0F6'} 
                  />
                  <Text style={[
                    styles.quickOptionName,
                    { color: selectedSubdomain === 'all' ? '#fff' : '#1A1A1A' }
                  ]}>
                    All Subtopics
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Specific Subtopics */}
            <View style={styles.domainsSection}>
              <Text style={styles.quickOptionsTitle}>Specific Subtopics</Text>
              <View style={styles.subdomainBarsContainer}>
                {getCurrentDomains().find(d => d.id === selectedDomain)?.subdomains.map((subdomain, index) => {
                  const accuracy = getSubdomainAccuracy(selectedSection || '', selectedDomain || '', subdomain);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.subdomainBar,
                        selectedSubdomain === subdomain && styles.selectedSubdomainBar,
                      ]}
                      onPress={() => setSelectedSubdomain(subdomain)}
                      activeOpacity={0.8}
                    >
                      <View style={[
                        styles.subdomainBarContent,
                        { backgroundColor: selectedSubdomain === subdomain ? '#1CB0F6' : '#FFFFFF' }
                      ]}>
                        <View style={styles.subdomainBarLeft}>
                          <Ionicons 
                            name="bookmark" 
                            size={20} 
                            color={selectedSubdomain === subdomain ? '#fff' : '#1CB0F6'} 
                          />
                          <Text style={[
                            styles.subdomainBarName,
                            { color: selectedSubdomain === subdomain ? '#fff' : '#1A1A1A' }
                          ]}>
                            {subdomain}
                          </Text>
                        </View>
                        <View style={styles.subdomainBarRight}>
                          <View style={styles.subdomainAccuracyContainer}>
                            <Text style={[
                              styles.subdomainAccuracyLabel,
                              { color: selectedSubdomain === subdomain ? 'rgba(255, 255, 255, 0.8)' : '#888' }
                            ]}>
                              Accuracy
                            </Text>
                            <Text style={[
                              styles.subdomainAccuracyText,
                              { color: selectedSubdomain === subdomain ? '#fff' : '#1CB0F6' }
                            ]}>
                              {formatAccuracy(accuracy)}
                            </Text>
                          </View>
                          {selectedSubdomain === subdomain && (
                            <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginLeft: 12 }} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.backButtonInline} 
              onPress={() => {
                if (selectedDomain === 'all' || selectedDomain === 'weak-areas') {
                  setSelectedDomain(null);
                } else {
                  setSelectedSubdomain(null);
                }
              }}
            >
              <Ionicons name="chevron-back" size={20} color="#1CB0F6" />
              <Text style={styles.backButtonText}>
                {selectedDomain === 'all' || selectedDomain === 'weak-areas' ? 'Back to Topics' : 'Back to Subtopics'}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.sectionTitle}>
              {selectedSubdomain === 'all' ? 'All Subtopics' : selectedSubdomain}
            </Text>
            <Text style={styles.sectionDescription}>
              Choose your preferred difficulty level
            </Text>
            
            {/* Any Difficulty Bar */}
            <TouchableOpacity
              style={[
                styles.anyDifficultyBar,
                selectedDifficulty === 'any' && styles.selectedAnyDifficultyBar,
              ]}
              onPress={() => setSelectedDifficulty('any')}
              activeOpacity={0.8}
            >
              <View style={[
                styles.anyDifficultyContent,
                { backgroundColor: selectedDifficulty === 'any' ? '#1CB0F6' : '#FFFFFF' }
              ]}>
                <View style={styles.anyDifficultyLeft}>
                  <Ionicons 
                    name="shuffle" 
                    size={24} 
                    color={selectedDifficulty === 'any' ? '#fff' : '#1CB0F6'} 
                  />
                  <View style={styles.anyDifficultyTextContainer}>
                    <Text style={[
                      styles.anyDifficultyName,
                      { color: selectedDifficulty === 'any' ? '#fff' : '#1A1A1A' }
                    ]}>
                      Any Difficulty
                    </Text>
                    <Text style={[
                      styles.anyDifficultyDescription,
                      { color: selectedDifficulty === 'any' ? 'rgba(255, 255, 255, 0.8)' : '#777' }
                    ]}>
                      Mix of all difficulty levels
                    </Text>
                  </View>
                </View>
                {selectedDifficulty === 'any' && (
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            {/* Specific Difficulty Bars */}
            <View style={styles.specificDifficultiesSection}>
              <Text style={styles.specificDifficultiesTitle}>Specific Levels</Text>
              <View style={styles.difficultyBarsContainer}>
                {difficulties.filter(d => d.id !== 'any').map((difficulty) => (
                  <TouchableOpacity
                    key={difficulty.id}
                    style={[
                      styles.difficultyBar,
                      selectedDifficulty === difficulty.id && styles.selectedDifficultyBar,
                    ]}
                    onPress={() => setSelectedDifficulty(difficulty.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.difficultyBarContent,
                      { 
                        backgroundColor: selectedDifficulty === difficulty.id 
                          ? difficulty.iconColor 
                          : difficulty.backgroundColor 
                      }
                    ]}>
                      <View style={styles.difficultyBarLeft}>
                        <Ionicons 
                          name={difficulty.icon as any} 
                          size={20} 
                          color={selectedDifficulty === difficulty.id ? '#fff' : difficulty.iconColor} 
                        />
                        <Text style={[
                          styles.difficultyBarName,
                          { color: selectedDifficulty === difficulty.id ? '#fff' : '#1A1A1A' }
                        ]}>
                          {difficulty.name}
                        </Text>
                      </View>
                                             {selectedDifficulty === difficulty.id && (
                         <Ionicons name="checkmark-circle" size={20} color="#fff" />
                       )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}


      </ScrollView>

      {selectedDomain && selectedDifficulty && 
       (selectedDomain === 'all' || selectedDomain === 'weak-areas' || selectedSubdomain) && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.startButton, isGeneratingQuestions && styles.startButtonDisabled]}
            onPress={handleStartPractice}
            activeOpacity={0.8}
            disabled={isGeneratingQuestions}
          >
            <LinearGradient
              colors={isGeneratingQuestions ? ['#A0A0A0', '#808080'] : ['#1CB0F6', '#1899D6']}
              style={styles.startButtonGradient}
            >
              {isGeneratingQuestions ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.startButtonText}>Generating Questions...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.startButtonText}>Start Practice Session</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },

  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#1CB0F6',
  },
  stepDotCompleted: {
    backgroundColor: '#58CC02',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  stepNumberInactive: {
    color: '#999',
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#58CC02',
  },
  backButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1CB0F6',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 16,
    color: '#777',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  sectionsContainer: {
    gap: 16,
  },
  sectionCard: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sectionCardContent: {
    flex: 1,
  },
  sectionCardBackground: {
    borderRadius: 20,
    padding: 24,
  },
  practiceButtonsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  quickPracticeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  quickPracticeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  customPracticeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  customPracticeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sectionAccuracyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  sectionAccuracyLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sectionAccuracyText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sectionDescriptionText: {
    fontSize: 16,
    color: '#777',
    fontWeight: '500',
  },
  domainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -8,
  },
  quickOptionsSection: {
    marginBottom: 32,
  },
  quickOptionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  quickOptionsList: {
    gap: 12,
  },
  quickOptionCard: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedQuickOptionCard: {
    shadowOpacity: 0.2,
    elevation: 6,
  },
  quickOptionContent: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  domainsSection: {
    marginBottom: 32,
  },
  simpleDomainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  simpleDomainCard: {
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedSimpleDomainCard: {
    shadowOpacity: 0.2,
    elevation: 6,
  },
  simpleDomainContent: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
    height: 140,
    justifyContent: 'space-between',
  },
  simpleDomainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  simpleDomainName: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  simpleDomainAccuracy: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  simpleDomainAccuracyLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  simpleDomainAccuracyText: {
    fontSize: 18,
    fontWeight: '700',
  },
  domainCard: {
    width: '48%',
    marginHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedDomainCard: {
    shadowOpacity: 0.2,
    elevation: 6,
  },
  domainCardContent: {
    borderRadius: 16,
    padding: 16,
    minHeight: 130,
  },
  domainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  domainIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  percentageLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
    marginTop: 1,
  },
  domainName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    lineHeight: 20,
  },
  domainSubtopicCount: {
    fontSize: 12,
    color: '#777',
    fontWeight: '500',
  },
  subdomainSection: {
    marginBottom: 32,
  },
  subdomainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  subdomainList: {
    gap: 12,
  },
  subdomainCard: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedSubdomainCard: {
    shadowColor: '#1CB0F6',
    shadowOpacity: 0.2,
    elevation: 6,
  },
  subdomainCardContent: {
    borderRadius: 16,
    padding: 16,
  },
  subdomainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subdomainName: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
  },
  subdomainDescription: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  anyDifficultyBar: {
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedAnyDifficultyBar: {
    shadowColor: '#1CB0F6',
    shadowOpacity: 0.2,
    elevation: 6,
  },
  anyDifficultyContent: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anyDifficultyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  anyDifficultyTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  anyDifficultyName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  anyDifficultyDescription: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  specificDifficultiesSection: {
    marginBottom: 32,
  },
  specificDifficultiesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  difficultyBarsContainer: {
    gap: 12,
  },
  difficultyBar: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedDifficultyBar: {
    shadowOpacity: 0.2,
    elevation: 6,
  },
  difficultyBarContent: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  difficultyBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBarName: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  allSubtopicsSection: {
    marginBottom: 24,
  },
  subdomainBarsContainer: {
    gap: 16,
  },
  subdomainBar: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedSubdomainBar: {
    shadowOpacity: 0.2,
    elevation: 6,
  },
  subdomainBarContent: {
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
  },
  subdomainBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subdomainBarName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  subdomainBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subdomainAccuracyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  subdomainAccuracyLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subdomainAccuracyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  startButton: {
    shadowColor: '#1CB0F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  startButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  startButtonGradient: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default PracticeScreen; 