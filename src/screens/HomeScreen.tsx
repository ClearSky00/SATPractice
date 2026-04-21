import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { questionService } from '../services/questions';
import { dailyPracticeService, DailyGoalStats } from '../services/dailyPractice';
import { SAT_READING_WRITING_DOMAINS, SAT_MATH_DOMAINS } from '../types';
import { satScoreEstimator } from '../services/satScoreEstimator';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<any>({});
  const [dailyGoalStats, setDailyGoalStats] = useState<DailyGoalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  // Refresh data when screen comes into focus (e.g., returning from practice)
  useFocusEffect(
    React.useCallback(() => {
        loadData();
    }, [user])
  );

  const loadData = async () => {
    try {
      console.log('Loading data for user:', user?.id || 'guest');
      
      // Use new service methods that handle both authenticated and guest users
      const [progressData, dailyGoalData] = await Promise.all([
        questionService.getPercentageCorrectBySectionForUser(user?.id),
        dailyPracticeService.getDailyGoalStatsForUser(user?.id)
      ]);
      
      console.log('Loaded data - progress:', progressData, 'daily goal:', dailyGoalData);
      
      setProgress(progressData);
      setDailyGoalStats(dailyGoalData);
    } catch (error) {
      console.error('Error loading data:', error);
      
      // If there's an error with daily goal stats for authenticated users, try creating test data
      if (user && error instanceof Error && error.message.includes('daily')) {
        console.log('Attempting to create test practice data...');
        try {
          await dailyPracticeService.createTestPracticeData(user.id);
          // Retry loading daily goal stats
          const dailyGoalData = await dailyPracticeService.getDailyGoalStatsForUser(user.id);
          setDailyGoalStats(dailyGoalData);
        } catch (retryError) {
          console.error('Error creating test data:', retryError);
        }
      } else {
        // Fallback for any other errors
        setProgress({
          'reading-writing': {
            'information-ideas': { correct: 0, total: 0 },
            'craft-structure': { correct: 0, total: 0 },
            'expression-ideas': { correct: 0, total: 0 },
            'standard-english': { correct: 0, total: 0 },
          },
          'math': {
            'algebra': { correct: 0, total: 0 },
            'advanced-math': { correct: 0, total: 0 },
            'problem-solving-data': { correct: 0, total: 0 },
            'geometry-trigonometry': { correct: 0, total: 0 },
          }
        });
        setDailyGoalStats({
          currentStreak: 0,
          todayMinutes: 0,
          todayQuestions: 0,
          dailyGoalMinutes: 60,
          percentage: 0,
          minutesRemaining: 60,
          weeklyPracticeDays: 0,
          weeklyProgressChange: 0
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (correct: number, total: number): number => {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  const getOverallProgress = (): { percentage: number; questionsAnswered: number } => {
    let totalCorrect = 0;
    let totalQuestions = 0;

    // Reading & Writing
    Object.values(progress['reading-writing'] || {}).forEach((domain: any) => {
      totalCorrect += domain.correct;
      totalQuestions += domain.total;
    });

    // Math
    Object.values(progress['math'] || {}).forEach((domain: any) => {
      totalCorrect += domain.correct;
      totalQuestions += domain.total;
    });

    return {
      percentage: calculatePercentage(totalCorrect, totalQuestions),
      questionsAnswered: totalQuestions
    };
  };

  const navigateToPractice = (section: string, domain?: string) => {
    navigation.navigate('Practice', { section, domain });
  };

  const navigateToFullPractice = async (section: string) => {
    try {
      const { questionGenerationService } = await import('../services/questionGenerationService');
      
      // Define domain data based on section
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

      // Get random domain and subtopic for the section
      const domains = section === 'reading-writing' ? readingWritingDomains : mathDomains;
      const randomDomain = domains[Math.floor(Math.random() * domains.length)];
      const randomSubtopic = randomDomain.subdomains[Math.floor(Math.random() * randomDomain.subdomains.length)];
      
      // For quick practice, use random difficulty
      const difficultyOptions = ['easy', 'medium', 'hard'];
      const randomDifficulty = difficultyOptions[Math.floor(Math.random() * difficultyOptions.length)] as 'easy' | 'medium' | 'hard';
      
      // Generate the first question
      const response = await questionGenerationService.generateQuestions({
        section: section as 'math' | 'reading-writing',
        topic: randomDomain.name,
        subtopic: randomSubtopic,
        difficulty: randomDifficulty,
        count: 1
      });

      // Navigate to question practice screen with all required parameters
      navigation.navigate('QuestionPractice', {
        section: section,
        domain: 'all-domains', // Special marker to indicate all domains practice
        subdomain: null, // Will cycle through all subdomains
        difficulty: 'any', // Will use random difficulties
        generationParams: {
          section: section as 'math' | 'reading-writing',
          topic: randomDomain.name,
          subtopic: randomSubtopic,
          difficulty: randomDifficulty,
        },
        firstQuestion: response.questions[0],
        initialUsage: response.usage,
        isQuickPractice: true
      });

    } catch (error) {
      console.error('Error starting quick practice:', error);
      Alert.alert(
        'Practice Error',
        'Failed to start practice session. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const getScoreEstimate = () => {
    if (!progress || (!progress['reading-writing'] && !progress['math'])) {
      return { 
        predictedScore: 400, 
        confidenceRange: { min: 400, max: 600 },
        confidence: 'low' as const,
        sectionScores: { readingWriting: 200, math: 200 }
      };
    }
    
    return satScoreEstimator.estimateScore(progress);
  };

  const overallProgress = getOverallProgress();
  const scoreEstimate = getScoreEstimate();



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Blue Gradient */}
        <LinearGradient
          colors={['#1CB0F6', '#1899D6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>
                Hello! 👋
              </Text>
              <Text style={styles.userNameText}>
                {user?.name || user?.email?.split('@')[0] || 'Student'}
              </Text>
              <Text style={styles.headerSubtext}>
                Ready to boost your SAT score?
              </Text>
            </View>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={24} color="#FFD900" />
              <Text style={styles.streakText}>{dailyGoalStats?.currentStreak || 0}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Daily Progress Card */}
        <View style={styles.dailyProgressSection}>
          <View style={styles.dailyProgressCard}>
            <View style={styles.dailyProgressHeader}>
              <View style={styles.progressIconContainer}>
                <Ionicons name="today" size={24} color="#1CB0F6" />
              </View>
              <View style={styles.progressInfo}>
                <Text style={styles.dailyProgressTitle}>Today's Progress</Text>
                <Text style={styles.dailyProgressSubtitle}>Keep up the great work!</Text>
              </View>
            </View>
            
            <View style={styles.dailyStatsContainer}>
              <View style={styles.dailyStatItem}>
                <Text style={styles.statNumber}>{dailyGoalStats?.todayMinutes || 0}</Text>
                <Text style={styles.statLabel}>mins studied</Text>
              </View>
              <View style={styles.dailyStatItem}>
                <Text style={styles.statNumber}>{dailyGoalStats?.todayQuestions || 0}</Text>
                <Text style={styles.statLabel}>questions answered</Text>
              </View>
            </View>

            <View style={styles.goalProgressContainer}>
              <View style={styles.goalProgressInfo}>
                <Text style={styles.goalProgressText}>Daily Goal: {dailyGoalStats?.dailyGoalMinutes || 60} mins</Text>
                <Text style={styles.goalProgressPercentage}>{dailyGoalStats?.percentage || 0}%</Text>
              </View>
              <View style={styles.goalProgressBar}>
                <View 
                  style={[
                    styles.goalProgressFill, 
                    { width: `${Math.min(dailyGoalStats?.percentage || 0, 100)}%` }
                  ]} 
                />
              </View>
            </View>
          </View>
        </View>

        {/* Score Prediction Card */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <Ionicons name="trophy" size={32} color="#FFD900" />
              <View style={styles.scoreInfo}>
                <Text style={styles.scoreTitle}>Predicted SAT Score</Text>
                <Text style={styles.scoreSubtitle}>Based on your performance</Text>
              </View>
            </View>
            
            <View style={styles.scoreDisplay}>
              <Text style={styles.scoreNumber}>{Math.round(scoreEstimate.predictedScore / 10) * 10}</Text>
            </View>
          </View>
        </View>

        {/* Quick Practice Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Practice</Text>
          <View style={styles.quickPracticeGrid}>
            <TouchableOpacity 
              style={styles.quickPracticeCard}
              onPress={() => navigateToFullPractice('reading-writing')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickPracticeIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="book" size={28} color="#1CB0F6" />
              </View>
              <Text style={styles.quickPracticeTitle}>Reading & Writing</Text>
              <Text style={styles.quickPracticeSubtitle}>All questions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickPracticeCard}
              onPress={() => navigateToFullPractice('math')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickPracticeIcon, { backgroundColor: '#E8F5E8' }]}>
                <Ionicons name="calculator" size={28} color="#58CC02" />
              </View>
              <Text style={styles.quickPracticeTitle}>Math</Text>
              <Text style={styles.quickPracticeSubtitle}>All questions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reading & Writing Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIconWrapper}>
                <Ionicons name="book" size={20} color="#1CB0F6" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Reading & Writing</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.sectionButton}
              onPress={() => navigateToPractice('reading-writing')}
            >
              <Text style={styles.sectionButtonText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#1CB0F6" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.domainList}>
            {SAT_READING_WRITING_DOMAINS.map((domain, index) => {
              const domainProgress = progress['reading-writing']?.[domain.id] || { correct: 0, total: 0 };
              const percentage = calculatePercentage(domainProgress.correct, domainProgress.total);
              
              const colors = [
                ['#E3F2FD', '#1CB0F6'],
                ['#E8F5E8', '#58CC02'],
                ['#FFF3E0', '#FF9800'],
                ['#F3E5F5', '#9C27B0']
              ];
              
              return (
                <TouchableOpacity
                  key={domain.id}
                  style={styles.domainCardWide}
                  onPress={() => navigateToPractice('reading-writing', domain.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.domainCardContent}>
                    <View style={styles.domainCardRow}>
                      <View style={[styles.domainIconCircle, { backgroundColor: colors[index % colors.length][0] }]}>
                        <Ionicons name="bookmark" size={24} color={colors[index % colors.length][1]} />
                      </View>
                      
                      <View style={styles.domainInfo}>
                        <Text style={styles.domainNameWide}>{domain.name}</Text>
                        <Text style={styles.domainSubtopics}>
                          {domain.subdomains.length} topics
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.domainProgressSection}>
                      <View style={styles.accuracyRow}>
                        <Text style={styles.domainPercentageWide}>{percentage}%</Text>
                        <Text style={styles.accuracyLabel}>accuracy</Text>
                      </View>
                      <View style={styles.progressBarWide}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { 
                              width: `${percentage}%`,
                              backgroundColor: colors[index % colors.length][1]
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Math Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIconWrapper}>
                <Ionicons name="calculator" size={20} color="#58CC02" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Math</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.sectionButton}
              onPress={() => navigateToPractice('math')}
            >
              <Text style={styles.sectionButtonText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#58CC02" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.domainList}>
            {SAT_MATH_DOMAINS.map((domain, index) => {
              const domainProgress = progress['math']?.[domain.id] || { correct: 0, total: 0 };
              const percentage = calculatePercentage(domainProgress.correct, domainProgress.total);
              
              const colors = [
                ['#E8F5E8', '#58CC02'],
                ['#FFF3E0', '#FF9800'],
                ['#E3F2FD', '#1CB0F6'],
                ['#F3E5F5', '#9C27B0']
              ];
              
              return (
                <TouchableOpacity
                  key={domain.id}
                  style={styles.domainCardWide}
                  onPress={() => navigateToPractice('math', domain.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.domainCardContent}>
                    <View style={styles.domainCardRow}>
                      <View style={[styles.domainIconCircle, { backgroundColor: colors[index % colors.length][0] }]}>
                        <Ionicons name="calculator" size={24} color={colors[index % colors.length][1]} />
                      </View>
                      
                      <View style={styles.domainInfo}>
                        <Text style={styles.domainNameWide}>{domain.name}</Text>
                        <Text style={styles.domainSubtopics}>
                          {domain.subdomains.length} topics
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.domainProgressSection}>
                      <View style={styles.accuracyRow}>
                        <Text style={styles.domainPercentageWide}>{percentage}%</Text>
                        <Text style={styles.accuracyLabel}>accuracy</Text>
                      </View>
                      <View style={styles.progressBarWide}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { 
                              width: `${percentage}%`,
                              backgroundColor: colors[index % colors.length][1]
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>


      </ScrollView>
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
    paddingBottom: 30,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
    marginBottom: 8,
  },
  headerSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  streakBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
    justifyContent: 'center',
  },
  streakText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 4,
  },
  dailyProgressSection: {
    paddingHorizontal: 24,
    marginTop: -20,
    marginBottom: 32,
  },
  dailyProgressCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1CB0F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  dailyProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  progressInfo: {
    flex: 1,
  },
  dailyProgressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  dailyProgressSubtitle: {
    fontSize: 14,
    color: '#777',
    fontWeight: '500',
  },
  dailyStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  dailyStatItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1CB0F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#777',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  goalProgressContainer: {
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    padding: 16,
  },
  goalProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  goalProgressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1CB0F6',
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#1CB0F6',
    borderRadius: 4,
  },
  scoreSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreInfo: {
    marginLeft: 16,
    flex: 1,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  scoreSubtitle: {
    fontSize: 14,
    color: '#777',
    fontWeight: '500',
  },
  scoreDisplay: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1CB0F6',
    marginBottom: 8,
  },
  scoreRange: {
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  rangeText: {
    fontSize: 14,
    color: '#777',
    fontWeight: '600',
  },
  confidenceBadge: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: '#1CB0F6',
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 24,
  },
  quickPracticeGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  quickPracticeCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickPracticeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickPracticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickPracticeSubtitle: {
    fontSize: 12,
    color: '#777',
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#777',
    fontWeight: '500',
  },
  sectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    height: 32,
  },
  sectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1CB0F6',
    marginRight: 4,
  },
  domainList: {
    gap: 12,
  },
  domainCardWide: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  domainCardContent: {
    padding: 20,
  },
  domainCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  domainIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  domainInfo: {
    flex: 1,
  },
  domainNameWide: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    lineHeight: 20,
  },
  domainSubtopics: {
    fontSize: 12,
    color: '#777',
    fontWeight: '500',
  },
  domainProgressSection: {
    marginLeft: 64,
  },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  domainPercentageWide: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginRight: 8,
  },
  progressBarWide: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1CB0F6',
    borderRadius: 4,
  },

  accuracyLabel: {
    fontSize: 10,
    color: '#777',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
});

export default HomeScreen; 