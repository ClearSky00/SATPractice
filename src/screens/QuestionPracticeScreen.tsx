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
  Animated,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { 
  GeneratedQuestion, 
  questionGenerationService, 
  AuthenticationError, 
  NetworkError, 
  QuestionGenerationServiceError,
  QuestionLimitReachedError 
} from '../services/questionGenerationService';
import { supabase } from '../config/supabase';
import { questionService } from '../services/questions';
import { questionLimitService } from '../services/questionLimitService';
import ErrorScreen from '../components/ErrorScreen';

const { width, height } = Dimensions.get('window');

// Enhanced text renderer with markdown and LaTeX math support
const EnhancedText: React.FC<{ children: string; style?: any }> = ({ children, style }) => {
  const parseMarkdownAndMath = (text: string) => {
    const parts: Array<{ 
      text: string; 
      bold?: boolean; 
      italic?: boolean; 
      math?: boolean;
      displayMath?: boolean;
    }> = [];
    
    // First, extract display math ($$...$$) and inline math ($...$)
    const tokens = text.split(/(\$\$[^$]*\$\$|\$[^$]*\$|\*\*.*?\*\*|\*.*?\*)/g);
    
    tokens.forEach(token => {
      if (token.startsWith('$$') && token.endsWith('$$')) {
        // Display math
        const mathContent = token.slice(2, -2);
        parts.push({ text: formatMathText(mathContent), displayMath: true });
      } else if (token.startsWith('$') && token.endsWith('$') && !token.startsWith('$$')) {
        // Inline math
        const mathContent = token.slice(1, -1);
        parts.push({ text: formatMathText(mathContent), math: true });
      } else if (token.startsWith('**') && token.endsWith('**')) {
        // Bold text
        parts.push({ text: token.slice(2, -2), bold: true });
      } else if (token.startsWith('*') && token.endsWith('*') && !token.startsWith('**')) {
        // Italic text
        parts.push({ text: token.slice(1, -1), italic: true });
      } else if (token) {
        // Regular text
        parts.push({ text: token });
      }
    });
    
    return parts;
  };

  const formatMathText = (mathText: string) => {
    // Convert LaTeX notation to Unicode equivalents
    return mathText
      // Fractions
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
      // Square roots
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/sqrt\(/g, '√(')
      // Superscripts (limited Unicode support)
      .replace(/\^2/g, '²')
      .replace(/\^3/g, '³')
      .replace(/\^4/g, '⁴')
      .replace(/\^5/g, '⁵')
      .replace(/\^6/g, '⁶')
      .replace(/\^7/g, '⁷')
      .replace(/\^8/g, '⁸')
      .replace(/\^9/g, '⁹')
      .replace(/\^0/g, '⁰')
      .replace(/\^1/g, '¹')
      .replace(/\^\{([^}]+)\}/g, '^($1)')
      // Subscripts
      .replace(/_\{([^}]+)\}/g, '_($1)')
      // Common math symbols
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\pm/g, '±')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\neq/g, '≠')
      .replace(/\\approx/g, '≈')
      .replace(/\\infty/g, '∞')
      .replace(/\\pi/g, 'π')
      .replace(/\\theta/g, 'θ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\delta/g, 'δ')
      // Clean up spacing
      .replace(/\s*=\s*/g, ' = ')
      .replace(/\s*\+\s*/g, ' + ')
      .replace(/\s*-\s*/g, ' - ')
      .replace(/\s*\*\s*/g, ' × ')
      .replace(/\s*\/\s*/g, ' ÷ ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const renderParts = () => {
    const parts = parseMarkdownAndMath(children);
    
    return parts.map((part, index) => {
      const partStyle = [
        part.bold && { fontWeight: '800' as const },
        part.italic && { fontStyle: 'italic' as const },
        part.math && { 
          fontFamily: 'Menlo, Monaco, monospace',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          paddingHorizontal: 4,
          paddingVertical: 2,
          borderRadius: 4,
        },
        part.displayMath && {
          fontFamily: 'Menlo, Monaco, monospace',
          fontSize: (style?.fontSize || 16) * 1.1,
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          paddingHorizontal: 8,
          paddingVertical: 6,
          borderRadius: 6,
          textAlign: 'center' as const,
        },
      ].filter(Boolean);
      
      if (part.displayMath) {
        return (
          <View key={index} style={{ alignItems: 'center', marginVertical: 8 }}>
            <Text style={partStyle}>
              {part.text}
            </Text>
          </View>
        );
      }
      
      return (
        <Text key={index} style={partStyle}>
          {part.text}
        </Text>
      );
    });
  };
  
  return (
    <Text style={[style, { 
      fontSize: style?.fontSize || 16,
      lineHeight: style?.lineHeight || (style?.fontSize ? style.fontSize * 1.4 : 22),
      fontFamily: 'System'
    }]}>
      {renderParts()}
    </Text>
  );
};

interface QuestionPracticeScreenProps {
  navigation: any;
  route: {
    params: {
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
      firstQuestion: GeneratedQuestion;
      initialUsage: {
        questionsUsed: number;
        monthlyLimit: number;
        remaining: number;
      };
    };
  };
}

const QuestionPracticeScreen: React.FC<QuestionPracticeScreenProps> = ({
  navigation,
  route,
}) => {
  const { section, domain, subdomain, difficulty, generationParams, firstQuestion, initialUsage } = route.params;

  // Domain definitions for random subtopic selection
  const readingWritingDomains = [
    {
      id: 'information-ideas',
      name: 'Information and Ideas',
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
      subdomains: [
        'Cross-Text Connections',
        'Text Structure and Purpose',
        'Words in Context'
      ]
    },
    {
      id: 'expression-ideas',
      name: 'Expression of Ideas',
      subdomains: [
        'Rhetorical Synthesis',
        'Transitions'
      ]
    },
    {
      id: 'standard-english',
      name: 'Standard English Conventions',
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
      subdomains: [
        'Equivalent expressions',
        'Nonlinear equations in 1 variable and systems of equations in 2 variables',
        'Nonlinear functions'
      ]
    },
    {
      id: 'problem-solving-data',
      name: 'Problem-Solving and Data Analysis',
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
      subdomains: [
        'Area and volume formulas',
        'Lines, angles, and triangles',
        'Right triangles and trigonometry',
        'Circles'
      ]
    }
  ];

  // Function to get random domain and subtopic when "All Subtopics" is selected
  const getRandomTopicAndSubtopic = async () => {
    if (subdomain) {
      return {
        domain: generationParams.topic,
        subtopic: subdomain
      };
    }
    
    // When "All Subtopics" is selected, pick from ALL domains in the section
    const domainList = section === 'reading-writing' ? readingWritingDomains : mathDomains;
    
    // Flatten all subtopics from all domains
    const allTopicsAndSubtopics: Array<{domain: string, subtopic: string}> = [];
    domainList.forEach(domain => {
      domain.subdomains.forEach(subtopic => {
        allTopicsAndSubtopics.push({
          domain: domain.name,
          subtopic: subtopic
        });
      });
    });
    
    // If "weak-areas" is selected, bias toward subtopics with lower accuracy
    if (domain === 'weak-areas' && allTopicsAndSubtopics.length > 0) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { questionService } = await import('../services/questions');
          const userProgress = await questionService.getDetailedProgress(session.user.id);
          
          // Create weighted selection based on inverse accuracy (lower accuracy = higher weight)
          const weightedSubtopics: Array<{domain: string, subtopic: string, weight: number}> = [];
          
          allTopicsAndSubtopics.forEach(({domain: domainName, subtopic}) => {
            // Find accuracy for this subtopic
            let accuracy = 50; // Default accuracy if no data
            
            // Map domain name to domain ID for lookup
            const domainId = domainList.find(d => d.name === domainName)?.id;
            if (domainId && userProgress[section] && userProgress[section][domainId]) {
              const domainData = userProgress[section][domainId];
              if (domainData.subdomains && domainData.subdomains[subtopic]) {
                accuracy = domainData.subdomains[subtopic].accuracy;
              } else {
                accuracy = domainData.accuracy || 50;
              }
            }
            
            // Higher weight for lower accuracy (inverse relationship)
            const weight = Math.max(1, 100 - accuracy + 20); // Ensures minimum weight of 1
            weightedSubtopics.push({domain: domainName, subtopic, weight});
          });
          
          // Weighted random selection
          const totalWeight = weightedSubtopics.reduce((sum, item) => sum + item.weight, 0);
          const randomValue = Math.random() * totalWeight;
          
          let currentWeight = 0;
          for (const item of weightedSubtopics) {
            currentWeight += item.weight;
            if (randomValue <= currentWeight) {
              return {domain: item.domain, subtopic: item.subtopic};
            }
          }
        }
      } catch (error) {
        console.warn('Could not load progress for weak areas selection:', error);
      }
    }
    
    // Fallback to random selection
    if (allTopicsAndSubtopics.length > 0) {
      const randomIndex = Math.floor(Math.random() * allTopicsAndSubtopics.length);
      return allTopicsAndSubtopics[randomIndex];
    }
    
    return {
      domain: generationParams.topic,
      subtopic: undefined
    };
  };
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [incorrectAttempts, setIncorrectAttempts] = useState<Set<string>>(new Set());
  const [clickedChoices, setClickedChoices] = useState<Set<string>>(new Set()); // Track which choices have been clicked
  const [foundCorrectAnswer, setFoundCorrectAnswer] = useState(false); // Track if correct answer has been found
  const [questionHistory, setQuestionHistory] = useState<Array<{
    questionIndex: number;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>>([]);
  const [allQuestions, setAllQuestions] = useState<GeneratedQuestion[]>(firstQuestion ? [firstQuestion] : []);
  const [isLoadingMoreQuestions, setIsLoadingMoreQuestions] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(0));
  
  // Session tracking state
  const [sessionStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0); // in milliseconds
  const [currentQuestionSubtopic, setCurrentQuestionSubtopic] = useState<string | null>(null);
  const [currentQuestionDomain, setCurrentQuestionDomain] = useState<string>(generationParams.topic);
  const [currentQuestionDifficulty, setCurrentQuestionDifficulty] = useState<string>(generationParams.difficulty);
  const [showTags, setShowTags] = useState(false);
  
  // Question timing state
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  
  // Error state
  const [error, setError] = useState<{
    title: string;
    message: string;
    type: 'network' | 'auth' | 'service' | 'general';
  } | null>(null);

  // Question limit status
  const [limitStatus, setLimitStatus] = useState<{
    questionsRemaining: number;
    isPremium: boolean;
    dailyLimit: number;
  } | null>(null);

  const currentQuestion = allQuestions[currentQuestionIndex];

  // Load question limit status
  const loadLimitStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      const status = await questionLimitService.checkQuestionLimit(userId);
      setLimitStatus({
        questionsRemaining: status.questionsRemaining,
        isPremium: status.isPremium,
        dailyLimit: status.dailyLimit,
      });
    } catch (error) {
      console.error('Error loading limit status:', error);
    }
  };

  // Load limit status on mount and after each question
  useEffect(() => {
    loadLimitStatus();
  }, [currentQuestionIndex]);

  // Update current time every second for live time tracking (pause when modal is shown)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!showEndSessionModal) {
        setCurrentTime(new Date());
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [showEndSessionModal]);

  // Start timing for the current question
  useEffect(() => {
    setQuestionStartTime(new Date());
  }, [currentQuestionIndex]);

  // Initialize the first question's topic and subtopic
  useEffect(() => {
    if (currentQuestionSubtopic === null) {
      getRandomTopicAndSubtopic().then(randomSelection => {
        setCurrentQuestionDomain(randomSelection.domain);
        setCurrentQuestionSubtopic(randomSelection.subtopic || null);
      });
    }
  }, []);

  // Check if firstQuestion is valid on mount
  useEffect(() => {
    if (!firstQuestion && allQuestions.length === 0) {
      setError({
        title: 'Failed to Load Question',
        message: 'Unable to load the initial question. Please try again.',
        type: 'service'
      });
    }
  }, []);

  useEffect(() => {
    // Animate in the question
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentQuestionIndex]);

  /**
   * Save user attempt to database or local storage
   */
  const saveUserAttempt = async (
    questionId: string,
    selectedAnswer: string,
    isCorrect: boolean,
    timeSpentSeconds: number
  ) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      const userId = session?.user?.id;
      
      if (userId) {
        // Ensure user exists in users table for authenticated users
        await ensureUserExists();
      }

      // Use the new service method that handles both authenticated and guest users
      // For database users: these fields don't matter since progress is calculated from question table
      // For local storage: we need to match the same format the database would produce
      console.log(`QuestionPracticeScreen: saving attempt with topic "${generationParams.topic}" and subtopic "${currentQuestion?.subtopic}"`);
      
      await questionService.saveUserAttemptForUser(
        userId,
        questionId,
        selectedAnswer,
        isCorrect,
        timeSpentSeconds,
        generationParams.section,
        generationParams.topic,
        currentQuestion?.subtopic,
        currentQuestion?.difficulty || 'medium'
      );

    } catch (error) {
      console.error('Error in saveUserAttempt:', error);
    }
  };

  /**
   * Ensure user exists in users table
   */
  const ensureUserExists = async (): Promise<boolean> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        return false;
      }

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (!existingUser) {
        // Create user record
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          });

        if (insertError) {
          console.error('Error creating user record:', insertError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in ensureUserExists:', error);
      return false;
    }
  };

  /**
   * Update daily practice statistics
   */
  const updateDailyPractice = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      const userId = session?.user?.id;
      
      if (userId) {
        // Ensure user exists for authenticated users
        await ensureUserExists();
      }

      // Get session duration in minutes
      const now = new Date().getTime();
      const sessionStart = sessionStartTime.getTime();
      let elapsedMs = now - sessionStart - totalPausedTime;
      
      if (pauseStartTime) {
        const currentPauseMs = now - pauseStartTime.getTime();
        elapsedMs -= currentPauseMs;
      }
      
      const minutesPracticed = Math.round(elapsedMs / 60000);

      // Use the new service method that handles both authenticated and guest users
      const { dailyPracticeService } = await import('../services/dailyPractice');
      await dailyPracticeService.updateTodaysPracticeForUser(
        userId,
        minutesPracticed,
        questionsAnswered,
        questionsCorrect,
        60 // Default daily goal
      );

    } catch (error) {
      console.error('Error in updateDailyPractice:', error);
    }
  };

  // Calculate session duration
  const getSessionDuration = () => {
    const now = currentTime.getTime();
    const sessionStart = sessionStartTime.getTime();
    
    // Calculate elapsed time minus total paused time
    let elapsedMs = now - sessionStart - totalPausedTime;
    
    // If currently paused, don't count the current pause period
    if (pauseStartTime) {
      const currentPauseMs = now - pauseStartTime.getTime();
      elapsedMs -= currentPauseMs;
    }
    
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Show error screen if there's an error
  if (error) {
    return (
      <ErrorScreen
        title={error.title}
        message={error.message}
        onRetry={() => {
          setError(null);
          if (allQuestions.length === 0) {
            // If no questions at all, retry initial generation
            handleRetryQuestionGeneration();
          } else {
            // If error during "next question", retry next question generation
            handleNextQuestion();
          }
        }}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  // If no questions available and no error, show loading
  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Loading...</Text>
            </View>
          </View>
        </LinearGradient>
        
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#667eea' }}>
            Loading question...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleAnswerSelect = async (answer: string) => {
    if (!currentQuestion) return;
    
    const isCorrect = answer === currentQuestion.correct_answer;
    const timeSpent = questionStartTime ? Math.round((new Date().getTime() - questionStartTime.getTime()) / 1000) : 0;
    
    setSelectedAnswer(answer);
    setClickedChoices(prev => new Set([...prev, answer])); // Track that this choice was clicked
    setShowExplanation(true); // Always show explanation immediately
    
    // Save user attempt to database (save all attempts, not just first ones)
    if (currentQuestion.id) {
      await saveUserAttempt(currentQuestion.id, answer, isCorrect, timeSpent);
    }
    
    if (isCorrect) {
      // Correct answer found - show all explanations and allow moving to next question
      setFoundCorrectAnswer(true);
      
      // Only count as answered and correct on the FIRST attempt per question
      if (!answeredQuestions.has(currentQuestionIndex)) {
        setQuestionsAnswered(prev => prev + 1);
        setAnsweredQuestions(prev => new Set([...prev, currentQuestionIndex]));
        setScore(prev => prev + 1);
        setQuestionsCorrect(prev => prev + 1);
      }
      
      // Add to question history
      setQuestionHistory(prev => [...prev, {
        questionIndex: currentQuestionIndex,
        selectedAnswer: answer,
        correctAnswer: currentQuestion.correct_answer,
        isCorrect: true
      }]);
    } else {
      // Incorrect answer - show why it's wrong and mark as incorrect
      setIncorrectAttempts(prev => new Set([...prev, answer]));
      
      // Count as answered on first attempt only (but not correct)
      if (!answeredQuestions.has(currentQuestionIndex)) {
        setQuestionsAnswered(prev => prev + 1);
        setAnsweredQuestions(prev => new Set([...prev, currentQuestionIndex]));
      }
      
      // Add to question history
      setQuestionHistory(prev => [...prev, {
        questionIndex: currentQuestionIndex,
        selectedAnswer: answer,
        correctAnswer: currentQuestion.correct_answer,
        isCorrect: false
      }]);
    }
  };

  /**
   * Handle error from question generation
   */
  const handleQuestionGenerationError = (error: Error) => {
    console.error('Question generation failed:', error);
    
    if (error instanceof AuthenticationError) {
      setError({
        title: 'Authentication Required',
        message: 'Please log in to continue practicing. Your session may have expired.',
        type: 'auth'
      });
    } else if (error instanceof NetworkError) {
      setError({
        title: 'Connection Problem',
        message: 'Unable to connect to our servers. Please check your internet connection and try again.',
        type: 'network'
      });
    } else if (error instanceof QuestionGenerationServiceError) {
      setError({
        title: 'Question Generation Failed',
        message: error.message,
        type: 'service'
      });
    } else {
      setError({
        title: 'Something went wrong',
        message: 'An unexpected error occurred while generating questions. Please try again.',
        type: 'general'
      });
    }
  };

  /**
   * Retry question generation (for initial question failure)
   */
  const handleRetryQuestionGeneration = async () => {
    try {
      setError(null);
      
      // Check question limit before retrying
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      const limitStatus = await questionLimitService.checkQuestionLimit(userId);
      
      if (!limitStatus.canGenerate && !limitStatus.isPremium) {
        // Show paywall for retry
        const upgradedToPremium = await questionLimitService.presentPaywall();
        
        if (!upgradedToPremium) {
          // User didn't upgrade, show limit reached error
          setError({
            title: 'Daily Limit Reached',
            message: `You've reached your daily limit of ${limitStatus.dailyLimit} questions. Upgrade to Premium for unlimited questions and access to all features.`,
            type: 'general'
          });
          return;
        }
        // If user upgraded, continue with question generation
        await loadLimitStatus(); // Refresh limit status after upgrade
      }
      
      const randomSelection = await getRandomTopicAndSubtopic();
      
      // Handle "any difficulty" case - pick a random difficulty for each question
      let actualDifficulty = generationParams.difficulty;
      if (difficulty === 'any') {
        const difficultyOptions = ['easy', 'medium', 'hard'];
        actualDifficulty = difficultyOptions[Math.floor(Math.random() * difficultyOptions.length)] as 'easy' | 'medium' | 'hard';
      }
      
      const response = await questionGenerationService.generateQuestions({
        section: generationParams.section,
        topic: randomSelection.domain,
        subtopic: randomSelection.subtopic,
        difficulty: actualDifficulty,
        count: 1
      });
      
      if (response.questions.length > 0) {
        setAllQuestions([response.questions[0]]);
        setCurrentQuestionDomain(randomSelection.domain);
        setCurrentQuestionSubtopic(randomSelection.subtopic || null);
        setCurrentQuestionDifficulty(actualDifficulty);
        await loadLimitStatus(); // Refresh limit status
      } else {
        throw new QuestionGenerationServiceError('No questions were generated');
      }
      
    } catch (error) {
      if (error instanceof QuestionLimitReachedError) {
        // Handle limit reached error specifically
        const upgradedToPremium = await questionLimitService.presentPaywall();
        
        if (!upgradedToPremium) {
          setError({
            title: 'Daily Limit Reached',
            message: error.message,
            type: 'general'
          });
        } else {
          // If user upgraded, retry the generation
          await loadLimitStatus(); // Refresh limit status after upgrade
          return handleRetryQuestionGeneration();
        }
      } else {
        handleQuestionGenerationError(error as Error);
      }
    }
  };

  const handleNextQuestion = async () => {
    // Generate a new question for infinite mode
    setIsLoadingMoreQuestions(true);
    
    try {
      // Check question limit before generating next question
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      const limitStatus = await questionLimitService.checkQuestionLimit(userId);
      
      if (!limitStatus.canGenerate && !limitStatus.isPremium) {
        setIsLoadingMoreQuestions(false);
        
        // Show paywall for next question
        const upgradedToPremium = await questionLimitService.presentPaywall();
        
        if (!upgradedToPremium) {
          // User didn't upgrade, show limit reached message
          Alert.alert(
            'Daily Limit Reached',
            `You've reached your daily limit of ${limitStatus.dailyLimit} questions. Upgrade to Premium for unlimited questions and access to all features.`,
            [
              { text: 'End Session', onPress: handleEndPractice },
              { text: 'View Premium', onPress: async () => {
                await questionLimitService.presentPaywall();
              }}
            ]
          );
          return;
        }
        // If user upgraded, continue with question generation
        await loadLimitStatus(); // Refresh limit status after upgrade
      }

      const randomSelection = await getRandomTopicAndSubtopic();
      
      // Handle "any difficulty" case - pick a random difficulty for each question
      let actualDifficulty = generationParams.difficulty;
      if (difficulty === 'any') {
        const difficultyOptions = ['easy', 'medium', 'hard'];
        actualDifficulty = difficultyOptions[Math.floor(Math.random() * difficultyOptions.length)] as 'easy' | 'medium' | 'hard';
      }
      
      const response = await questionGenerationService.generateQuestions({
        section: generationParams.section,
        topic: randomSelection.domain,
        subtopic: randomSelection.subtopic,
        difficulty: actualDifficulty,
        count: 1
      });
      
      // Validate response
      if (!response || !response.questions || response.questions.length === 0) {
        throw new QuestionGenerationServiceError('No questions received from service');
      }

      // Animate out and in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Add the new question and move to it
        setAllQuestions(prev => [...prev, ...response.questions]);
        setCurrentQuestionIndex(prev => prev + 1);
        setCurrentQuestionDomain(randomSelection.domain); // Update current domain
        setCurrentQuestionSubtopic(randomSelection.subtopic || null); // Update current subtopic
        setCurrentQuestionDifficulty(actualDifficulty); // Update current difficulty
        setSelectedAnswer(null);
        setShowExplanation(false);
        setShowHint(false); // Reset hint for new question
        setIncorrectAttempts(new Set()); // Reset incorrect attempts for new question
        setClickedChoices(new Set()); // Reset clicked choices for new question
        setFoundCorrectAnswer(false); // Reset correct answer flag for new question
        slideAnim.setValue(50);
        fadeAnim.setValue(0);
        setIsLoadingMoreQuestions(false);
      });
    } catch (error) {
      setIsLoadingMoreQuestions(false);
      
      if (error instanceof QuestionLimitReachedError) {
        // Handle limit reached error specifically
        const upgradedToPremium = await questionLimitService.presentPaywall();
        
        if (!upgradedToPremium) {
          Alert.alert(
            'Daily Limit Reached',
            error.message,
            [
              { text: 'End Session', onPress: handleEndPractice },
              { text: 'View Premium', onPress: async () => {
                await questionLimitService.presentPaywall();
              }}
            ]
          );
        } else {
          // If user upgraded, retry the generation
          await loadLimitStatus(); // Refresh limit status after upgrade
          return handleNextQuestion();
        }
      } else {
        handleQuestionGenerationError(error as Error);
      }
    }
  };

  const handleEndPractice = () => {
    // Start pause timer
    setPauseStartTime(new Date());
    setShowEndSessionModal(true);
  };

  const toggleHint = () => {
    setShowHint(prev => !prev);
  };

  const getChoiceStyle = (choice: string) => {
    // Show currently selected answer
    if (selectedAnswer === choice) {
      const isCorrect = choice === currentQuestion.correct_answer;
      if (isCorrect) {
        return styles.correctChoice;
      } else {
        return styles.incorrectChoice;
      }
    }
    
    // Mark previous incorrect attempts (but keep them clickable)
    if (incorrectAttempts.has(choice)) {
      return styles.incorrectChoice;
    }
    
    return styles.choice;
  };

  const getChoiceTextStyle = (choice: string) => {
    // Show currently selected answer
    if (selectedAnswer === choice) {
      const isCorrect = choice === currentQuestion.correct_answer;
      if (isCorrect) {
        return styles.correctChoiceText;
      } else {
        return styles.incorrectChoiceText;
      }
    }
    
    // Mark previous incorrect attempts
    if (incorrectAttempts.has(choice)) {
      return styles.incorrectChoiceText;
    }
    
    return styles.choiceText;
  };

  const getExplanation = (choice: string) => {
    switch (choice) {
      case 'A': return currentQuestion.explanation_choice_a;
      case 'B': return currentQuestion.explanation_choice_b;
      case 'C': return currentQuestion.explanation_choice_c;
      case 'D': return currentQuestion.explanation_choice_d;
      default: return '';
    }
  };

  const shouldShowExplanation = (choice: string) => {
    if (!showExplanation) return false;
    
    // If correct answer has been found, show all explanations
    if (foundCorrectAnswer) {
      return true;
    }
    
    // Otherwise, only show explanation for choices that have been clicked
    return clickedChoices.has(choice);
  };

  // Duolingo-style choice styling functions
  const getDuolingoChoiceStyle = (choice: string) => {
    // Show currently selected answer
    if (selectedAnswer === choice) {
      const isCorrect = choice === currentQuestion.correct_answer;
      if (isCorrect) {
        return styles.duolingoChoiceCorrect;
      } else {
        return styles.duolingoChoiceIncorrect;
      }
    }
    
    // Mark previous incorrect attempts
    if (incorrectAttempts.has(choice)) {
      return styles.duolingoChoiceIncorrect;
    }
    
    return styles.duolingoChoice;
  };

  const getDuolingoChoiceLabelStyle = (choice: string) => {
    // Show currently selected answer
    if (selectedAnswer === choice) {
      const isCorrect = choice === currentQuestion.correct_answer;
      if (isCorrect) {
        return styles.duolingoChoiceLabelCorrect;
      } else {
        return styles.duolingoChoiceLabelIncorrect;
      }
    }
    
    // Mark previous incorrect attempts
    if (incorrectAttempts.has(choice)) {
      return styles.duolingoChoiceLabelIncorrect;
    }
    
    return styles.duolingoChoiceLabel;
  };

  const getDuolingoChoiceLabelTextStyle = (choice: string) => {
    // Show currently selected answer
    if (selectedAnswer === choice) {
      const isCorrect = choice === currentQuestion.correct_answer;
      if (isCorrect) {
        return styles.duolingoChoiceLabelTextCorrect;
      } else {
        return styles.duolingoChoiceLabelTextIncorrect;
      }
    }
    
    // Mark previous incorrect attempts
    if (incorrectAttempts.has(choice)) {
      return styles.duolingoChoiceLabelTextIncorrect;
    }
    
    return styles.duolingoChoiceLabelText;
  };

  const getDuolingoChoiceTextStyle = (choice: string) => {
    // Show currently selected answer
    if (selectedAnswer === choice) {
      const isCorrect = choice === currentQuestion.correct_answer;
      if (isCorrect) {
        return styles.duolingoChoiceTextCorrect;
      } else {
        return styles.duolingoChoiceTextIncorrect;
      }
    }
    
    // Mark previous incorrect attempts
    if (incorrectAttempts.has(choice)) {
      return styles.duolingoChoiceTextIncorrect;
    }
    
    return styles.duolingoChoiceText;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Clean Header */}
      <View style={styles.modernHeader}>
        {/* Top Bar */}
        <View style={styles.modernTopBar}>
          <TouchableOpacity
            style={styles.modernCloseButton}
            onPress={handleEndPractice}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.modernTitle}>
            {section === 'math' ? 'Math Practice' : 'Reading & Writing'}
          </Text>
          
          <View style={styles.modernPlaceholder} />
        </View>

        {/* Stats Row */}
        <View style={styles.modernStatsRow}>
          <View style={styles.modernStatItem}>
            <Text style={styles.modernStatValue}>{getSessionDuration()}</Text>
            <Text style={styles.modernStatLabel}>Time</Text>
          </View>
          
          <View style={styles.modernStatDivider} />
          
          <View style={styles.modernStatItem}>
            <Text style={styles.modernStatValue}>{questionsAnswered}</Text>
            <Text style={styles.modernStatLabel}>Questions</Text>
          </View>
          
          <View style={styles.modernStatDivider} />
          
          <View style={styles.modernStatItem}>
            <Text style={styles.modernStatValue}>
              {questionsAnswered > 0 ? Math.round((questionsCorrect / questionsAnswered) * 100) : 0}%
            </Text>
            <Text style={styles.modernStatLabel}>Accuracy</Text>
          </View>
        </View>

        {/* Optional Topic Tags */}
        {showTags && (
          <View style={styles.modernTagsContainer}>
            <View style={styles.modernTag}>
              <Text style={styles.modernTagText}>{currentQuestionDomain}</Text>
            </View>
            {currentQuestionSubtopic && (
              <View style={styles.modernTag}>
                <Text style={styles.modernTagText}>{currentQuestionSubtopic}</Text>
              </View>
            )}
            <View style={styles.modernTag}>
              <Text style={styles.modernTagText}>
                {(difficulty === 'any' ? currentQuestionDifficulty : difficulty).charAt(0).toUpperCase() + (difficulty === 'any' ? currentQuestionDifficulty : difficulty).slice(1)}
              </Text>
            </View>
          </View>
        )}

        {/* Show Topics Toggle */}
        <TouchableOpacity
          style={styles.modernToggleButton}
          onPress={() => setShowTags(!showTags)}
          activeOpacity={0.7}
        >
          <Text style={styles.modernToggleText}>
            {showTags ? 'Hide Details' : 'Show Details'}
          </Text>
          <Ionicons 
            name={showTags ? "chevron-up" : "chevron-down"} 
            size={14} 
            color="rgba(255, 255, 255, 0.9)" 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.duolingoContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.duolingoQuestionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Question Card */}
          <View style={styles.duolingoQuestionCard}>
            <View style={styles.questionHeader}>
              <View style={styles.infiniteQuestionCounter}>
                <Ionicons name="infinite" size={16} color="#667eea" />
                <Text style={styles.questionCounter}>Question {currentQuestionIndex + 1}</Text>
              </View>
              <View style={styles.questionTypeIndicator}>
                <Text style={styles.questionTypeText}>
                  {section === 'math' ? 'MATH' : 'READING'}
                </Text>
              </View>
            </View>
            
            <EnhancedText style={styles.duolingoQuestionText}>
              {currentQuestion.question_text}
            </EnhancedText>
            
            {currentQuestion.hint && (
              <View style={styles.duolingoHintSection}>
                <TouchableOpacity
                  style={styles.duolingoHintButton}
                  onPress={toggleHint}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={showHint ? "bulb" : "bulb-outline"} 
                    size={18} 
                    color="#4285f4" 
                  />
                  <Text style={styles.duolingoHintButtonText}>
                    {showHint ? "Hide Hint" : "Show Hint"}
                  </Text>
                </TouchableOpacity>
                
                {showHint && (
                  <View style={styles.duolingoHintCard}>
                    <Ionicons name="information-circle" size={16} color="#4285f4" />
                    <EnhancedText style={styles.duolingoHintText}>
                      {currentQuestion.hint}
                    </EnhancedText>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Answer Choices */}
          <View style={styles.duolingoChoicesContainer}>
            {['A', 'B', 'C', 'D'].map((choice, index) => {
              const choiceContent = choice === 'A' ? currentQuestion.choice_a :
                                 choice === 'B' ? currentQuestion.choice_b :
                                 choice === 'C' ? currentQuestion.choice_c :
                                 currentQuestion.choice_d;
              
              return (
                <TouchableOpacity
                  key={choice}
                  style={getChoiceStyle(choice)}
                  onPress={() => handleAnswerSelect(choice)}
                  activeOpacity={0.8}
                  disabled={foundCorrectAnswer}
                >
                  <View style={styles.duolingoChoiceContent}>
                                         <View style={getDuolingoChoiceLabelStyle(choice)}>
                       <Text style={getDuolingoChoiceLabelTextStyle(choice)}>{choice}</Text>
                    </View>
                                         <EnhancedText style={getDuolingoChoiceTextStyle(choice)}>
                       {choiceContent}
                     </EnhancedText>
                    
                    {/* Choice Status Icon */}
                    {showExplanation && clickedChoices.has(choice) && (
                      <View style={styles.choiceStatusIcon}>
                        {choice === currentQuestion.correct_answer ? (
                          <Ionicons name="checkmark-circle" size={24} color="#34a853" />
                        ) : (
                          <Ionicons name="close-circle" size={24} color="#ea4335" />
                        )}
                      </View>
                    )}
                  </View>
                  
                  {/* Explanation */}
                  {showExplanation && shouldShowExplanation(choice) && (
                    <View style={styles.duolingoExplanationContainer}>
                      <View style={styles.explanationHeader}>
                        <Ionicons 
                          name={choice === currentQuestion.correct_answer ? "checkmark-circle" : "information-circle"} 
                          size={16} 
                          color={choice === currentQuestion.correct_answer ? "#34a853" : "#4285f4"} 
                        />
                        <Text style={styles.explanationHeaderText}>
                          {choice === currentQuestion.correct_answer ? "Correct!" : "Explanation"}
                        </Text>
                      </View>
                      <EnhancedText style={styles.duolingoExplanationText}>
                        {getExplanation(choice)}
                      </EnhancedText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Next Button */}
          {foundCorrectAnswer && (
            <TouchableOpacity
              style={[styles.duolingoNextButton, isLoadingMoreQuestions && styles.duolingoNextButtonDisabled]}
              onPress={handleNextQuestion}
              activeOpacity={0.8}
              disabled={isLoadingMoreQuestions}
            >
              <LinearGradient
                colors={isLoadingMoreQuestions ? ['#9aa0a6', '#5f6368'] : ['#34a853', '#137333']}
                style={styles.duolingoNextButtonGradient}
              >
                {isLoadingMoreQuestions ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.duolingoNextButtonText}>
                      Generating...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.duolingoNextButtonText}>
                      Continue
                    </Text>
                    <Ionicons 
                      name="arrow-forward" 
                      size={20} 
                      color="#fff" 
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Custom End Session Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showEndSessionModal}
        onRequestClose={() => setShowEndSessionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#1CB0F6', '#0E90C7']}
              style={styles.modalGradient}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.modalTitle}>Session Complete</Text>
                <Text style={styles.modalSubtitle}>Great work! Here's your progress:</Text>
              </View>

              {/* Stats Grid */}
              <View style={styles.modalStatsGrid}>
                <View style={styles.modalStatItem}>
                  <View style={styles.modalStatIconContainer}>
                    <Ionicons name="time" size={18} color="#1CB0F6" />
                  </View>
                  <Text style={styles.modalStatValue}>{getSessionDuration()}</Text>
                  <Text style={styles.modalStatLabel}>Time</Text>
                </View>
                
                <View style={styles.modalStatItem}>
                  <View style={styles.modalStatIconContainer}>
                    <Ionicons name="library" size={18} color="#1CB0F6" />
                  </View>
                  <Text style={styles.modalStatValue}>{questionsAnswered}</Text>
                  <Text style={styles.modalStatLabel}>Questions</Text>
                </View>
                
                <View style={styles.modalStatItem}>
                  <View style={styles.modalStatIconContainer}>
                    <Ionicons name="checkmark-circle" size={18} color="#1CB0F6" />
                  </View>
                  <Text style={styles.modalStatValue}>{questionsCorrect}</Text>
                  <Text style={styles.modalStatLabel}>Correct</Text>
                </View>
                
                <View style={styles.modalStatItem}>
                  <View style={styles.modalStatIconContainer}>
                    <Ionicons name="analytics" size={18} color="#1CB0F6" />
                  </View>
                  <Text style={styles.modalStatValue}>
                    {questionsAnswered > 0 ? Math.round((questionsCorrect / questionsAnswered) * 100) : 0}%
                  </Text>
                  <Text style={styles.modalStatLabel}>Accuracy</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => {
                    // Resume timer by adding paused time to total
                    if (pauseStartTime) {
                      const pauseDuration = new Date().getTime() - pauseStartTime.getTime();
                      setTotalPausedTime(prev => prev + pauseDuration);
                      setPauseStartTime(null);
                    }
                    setShowEndSessionModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalButtonSecondaryText}>Continue Practice</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalButtonPrimary}
                  onPress={async () => {
                    setShowEndSessionModal(false);
                    await updateDailyPractice();
                    navigation.goBack();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="home-outline" size={18} color="#1CB0F6" style={{ marginRight: 6 }} />
                  <Text style={styles.modalButtonPrimaryText}>End Session</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerBadgeContainer: {
    marginBottom: 8,
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sectionBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  detailBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  detailBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  difficultyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  difficultyBadgeText: {
    color: '#fff',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  endButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  questionContainer: {
    padding: 24,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    lineHeight: 26,
    marginBottom: 16,
  },
  hintSection: {
    marginTop: 8,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7faff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  hintButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  hintContainer: {
    backgroundColor: '#f7faff',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  hintText: {
    fontSize: 14,
    color: '#667eea',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  choicesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  choice: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedChoice: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  correctChoice: {
    backgroundColor: '#f0fff4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#38a169',
    shadowColor: '#38a169',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  incorrectChoice: {
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e53e3e',
    shadowColor: '#e53e3e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  choiceContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  choiceLabel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f7faff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
  },
  selectedChoiceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  correctChoiceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#38a169',
  },
  incorrectChoiceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e53e3e',
  },
  choiceDescription: {
    fontSize: 16,
    color: '#2d3748',
    flex: 1,
    lineHeight: 22,
  },
  explanationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  explanationText: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  nextButton: {
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  nextButtonGradient: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },

  labeledStatsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  labeledStatsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  labeledStatItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  labeledStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: 4,
    lineHeight: 24,
  },
  labeledStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  showTagsContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  showTagsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  showTopicsText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tagsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  sessionStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 28,
    shadowColor: '#1CB0F6',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 24,
  },
  modalGradient: {
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: 'rgba(255, 255, 255, 0.3)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
    fontFamily: 'System',
  },
  modalSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 28,
    gap: 12,
  },
  modalStatItem: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    shadowColor: 'rgba(28, 176, 246, 0.2)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(28, 176, 246, 0.1)',
  },
  modalStatIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(28, 176, 246, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalStatValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    letterSpacing: -0.8,
    fontFamily: 'System',
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 14,
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(28, 176, 246, 0.1)',
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1CB0F6',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  duolingoHeader: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    height: 16,
    flex: 1,
  },
  progressFill: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    height: '100%',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  heartsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heartsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  infiniteCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  infiniteCounterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  infiniteQuestionCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subjectSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subjectTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  topicsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topicTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 1,
  },
  topicTagText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  showTopicsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  duolingoContent: {
    flex: 1,
  },
  duolingoQuestionContainer: {
    padding: 24,
  },
  duolingoQuestionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  questionCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  questionTypeIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  questionTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  duolingoQuestionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    lineHeight: 26,
    marginBottom: 16,
  },
  duolingoHintSection: {
    marginTop: 8,
  },
  duolingoHintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7faff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  duolingoHintButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  duolingoHintCard: {
    backgroundColor: '#f7faff',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  duolingoHintText: {
    fontSize: 14,
    color: '#667eea',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  duolingoChoicesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  duolingoChoiceContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  choiceStatusIcon: {
    marginLeft: 'auto',
  },
  duolingoExplanationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  explanationHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  duolingoExplanationText: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  duolingoNextButton: {
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  duolingoNextButtonGradient: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  duolingoNextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  duolingoNextButtonDisabled: {
    opacity: 0.7,
  },
  
  // Duolingo Choice Styles
  duolingoChoice: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  duolingoChoiceSelected: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4285f4',
    shadowColor: '#4285f4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  duolingoChoiceCorrect: {
    backgroundColor: '#f0fff4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#34a853',
    shadowColor: '#34a853',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  duolingoChoiceIncorrect: {
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#ea4335',
    shadowColor: '#ea4335',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  duolingoChoiceLabel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f7faff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  duolingoChoiceLabelSelected: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4285f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  duolingoChoiceLabelCorrect: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34a853',
    justifyContent: 'center',
    alignItems: 'center',
  },
  duolingoChoiceLabelIncorrect: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ea4335',
    justifyContent: 'center',
    alignItems: 'center',
  },
  duolingoChoiceLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
  },
  duolingoChoiceLabelTextSelected: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  duolingoChoiceLabelTextCorrect: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  duolingoChoiceLabelTextIncorrect: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  duolingoChoiceText: {
    fontSize: 16,
    color: '#2d3748',
    flex: 1,
    lineHeight: 22,
  },
  duolingoChoiceTextSelected: {
    fontSize: 16,
    color: '#4285f4',
    flex: 1,
    lineHeight: 22,
    fontWeight: '600',
  },
  duolingoChoiceTextCorrect: {
    fontSize: 16,
    color: '#34a853',
    flex: 1,
    lineHeight: 22,
    fontWeight: '600',
  },
  duolingoChoiceTextIncorrect: {
    fontSize: 16,
    color: '#ea4335',
    flex: 1,
    lineHeight: 22,
    fontWeight: '600',
  },
  
  // Modern Header Styles with Blue Theme
  modernHeader: {
    backgroundColor: '#1CB0F6',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#1CB0F6',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modernTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modernCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  modernTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modernPlaceholder: {
    width: 36,
    height: 36,
  },
  modernStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modernStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  modernStatValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  modernStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modernStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 14,
  },
  modernTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modernTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modernTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modernToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  modernToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

export default QuestionPracticeScreen; 