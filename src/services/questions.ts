import { supabase } from '../config/supabase';
import { Question } from '../types';
import { revenueCatService } from './revenueCat';
import { localStorageService } from './localStorageService';

export const questionService = {
  // ===== MAIN METHODS (AUTO-DETECT USER TYPE) =====

  async saveUserAttemptForUser(
    userId: string | undefined,
    questionId: string,
    selectedAnswer: string,
    isCorrect: boolean,
    timeSpentSeconds: number,
    section: string,
    domain: string,
    subdomain?: string,
    difficulty: string = 'medium'
  ): Promise<void> {
    if (userId) {
      // Authenticated user - save to database
      await this.saveUserAttempt(userId, questionId, selectedAnswer, isCorrect, timeSpentSeconds);
    } else {
      // Guest user - save to local storage
      console.log(`Questions service: saving attempt - section: "${section}", domain: "${domain}", subdomain: "${subdomain}"`);
      await localStorageService.saveUserAttempt({
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        time_spent_seconds: timeSpentSeconds,
        section,
        domain,
        subdomain,
        difficulty,
      });
    }
  },

  async getPercentageCorrectBySectionForUser(userId?: string) {
    if (userId) {
      return await this.getPercentageCorrectBySection(userId);
    } else {
      // Guest user - get from local storage and normalize the format
      const progressStats = await localStorageService.getProgressStats();
      
      // Ensure the expected structure exists
      const normalizedProgress = {
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
      };

      // Copy data from local storage, ensuring we use the expected keys
      Object.keys(progressStats.sections).forEach(sectionKey => {
        const section = progressStats.sections[sectionKey];
        const normalizedSection = (normalizedProgress as any)[sectionKey];
        
        if (normalizedSection) {
          Object.keys(section).forEach(domainKey => {
            if (normalizedSection[domainKey]) {
              normalizedSection[domainKey] = section[domainKey];
            }
          });
        }
      });

      return normalizedProgress;
    }
  },

  async getDetailedProgressForUser(userId?: string) {
    if (userId) {
      return await this.getDetailedProgress(userId);
    } else {
      // Guest user - convert local storage format to detailed progress format
      const progressStats = await localStorageService.getProgressStats();
      const detailedProgress: any = {
        'reading-writing': {
          'information-ideas': { correct: 0, total: 0, accuracy: 0, subdomains: {} },
          'craft-structure': { correct: 0, total: 0, accuracy: 0, subdomains: {} },
          'expression-ideas': { correct: 0, total: 0, accuracy: 0, subdomains: {} },
          'standard-english': { correct: 0, total: 0, accuracy: 0, subdomains: {} },
        },
        'math': {
          'algebra': { correct: 0, total: 0, accuracy: 0, subdomains: {} },
          'advanced-math': { correct: 0, total: 0, accuracy: 0, subdomains: {} },
          'problem-solving-data': { correct: 0, total: 0, accuracy: 0, subdomains: {} },
          'geometry-trigonometry': { correct: 0, total: 0, accuracy: 0, subdomains: {} },
        }
      };

      // Copy data from local storage format
      Object.keys(progressStats.sections).forEach(sectionKey => {
        if (detailedProgress[sectionKey]) {
          Object.keys(progressStats.sections[sectionKey]).forEach(domainKey => {
            if (detailedProgress[sectionKey][domainKey]) {
              const localDomain = progressStats.sections[sectionKey][domainKey];
              const detailDomain = detailedProgress[sectionKey][domainKey];
              
              detailDomain.correct = localDomain.correct;
              detailDomain.total = localDomain.total;
              detailDomain.accuracy = localDomain.total > 0 ? Math.round((localDomain.correct / localDomain.total) * 100) : 0;
              
              // Copy subdomains if they exist
              if (localDomain.subdomains) {
                Object.keys(localDomain.subdomains).forEach(subdomainKey => {
                  const localSubdomain = localDomain.subdomains![subdomainKey];
                  detailDomain.subdomains[subdomainKey] = {
                    correct: localSubdomain.correct,
                    total: localSubdomain.total,
                    accuracy: localSubdomain.total > 0 ? Math.round((localSubdomain.correct / localSubdomain.total) * 100) : 0,
                  };
                });
              }
            }
          });
        }
      });

      return detailedProgress;
    }
  },

  // ===== DATABASE METHODS (AUTHENTICATED USERS) =====

  async saveUserAttempt(
    userId: string,
    questionId: string,
    selectedAnswer: string,
    isCorrect: boolean,
    timeSpentSeconds: number
  ): Promise<void> {
    const { error } = await supabase
      .from('user_attempts')
      .insert({
        user_id: userId,
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        time_spent_seconds: timeSpentSeconds,
      });

    if (error) throw error;
  },
  async getQuestions(
    section?: 'reading-writing' | 'math',
    domain?: string,
    subdomain?: string,
    difficulty?: 'easy' | 'medium' | 'hard',
    limit: number = 10
  ): Promise<Question[]> {
    // Check premium status from RevenueCat directly (works for anonymous and authenticated users)
    const isPremiumUser = await revenueCatService.checkProEntitlement();
    
    let query = supabase
      .from('questions')
      .select('*')
      .limit(limit);

    if (section) {
      query = query.eq('section', section);
    }

    if (domain) {
      query = query.eq('domain', domain);
    }

    if (subdomain) {
      query = query.eq('subdomain', subdomain);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    // If user doesn't have premium entitlement, only show free questions
    // Note: Currently there are no premium questions, so this is future-proofing
    if (!isPremiumUser) {
      query = query.eq('isPremium', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getRandomQuestions(
    count: number = 10
  ): Promise<Question[]> {
    // Check premium status from RevenueCat directly
    const isPremiumUser = await revenueCatService.checkProEntitlement();
    
    let query = supabase
      .from('questions')
      .select('*')
      .limit(count * 2); // Get more to randomize

    // If user doesn't have premium entitlement, only show free questions
    if (!isPremiumUser) {
      query = query.eq('isPremium', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Shuffle and return requested count
    const shuffled = (data || []).sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  },

  async getQuestionsBySection(
    section: 'reading-writing' | 'math',
    domain?: string,
    subdomain?: string,
    limit: number = 10
  ): Promise<Question[]> {
    return this.getQuestions(
      section,
      domain,
      subdomain,
      undefined,
      limit
    );
  },

  async getPercentageCorrectBySection(userId: string) {
    // Query user attempts with question details
    const { data, error } = await supabase
      .from('user_attempts')
      .select(`
        is_correct,
        questions (
          subject,
          topic
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    // Initialize the progress structure
    const progress = {
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
    };

    // Topic to domain mapping
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

    // Process the data
    data?.forEach((attempt: any) => {
      const question = attempt.questions;
      if (!question) return;

      const subject = question.subject;
      const topic = question.topic;
      
      // Map topic to domain
      const domain = topicToDomain[topic] || 
                    topicToDomain[topic?.toLowerCase()] || 
                    (subject === 'math' ? 'algebra' : 'information-ideas'); // fallback

      if (subject in progress && domain in (progress as any)[subject]) {
        (progress as any)[subject][domain].total += 1;
        if (attempt.is_correct) {
          (progress as any)[subject][domain].correct += 1;
        }
      }
    });

    return progress;
  },

  async getDetailedProgress(userId: string) {
    // Query user attempts with question details including subtopic
    const { data, error } = await supabase
      .from('user_attempts')
      .select(`
        is_correct,
        questions (
          subject,
          topic,
          subtopic
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    // Initialize the detailed progress structure
    const progress: any = {
      'reading-writing': {
        'information-ideas': { 
          correct: 0, 
          total: 0, 
          accuracy: 0,
          subdomains: {} 
        },
        'craft-structure': { 
          correct: 0, 
          total: 0, 
          accuracy: 0,
          subdomains: {} 
        },
        'expression-ideas': { 
          correct: 0, 
          total: 0, 
          accuracy: 0,
          subdomains: {} 
        },
        'standard-english': { 
          correct: 0, 
          total: 0, 
          accuracy: 0,
          subdomains: {} 
        },
      },
      'math': {
        'algebra': { 
          correct: 0, 
          total: 0, 
          accuracy: 0,
          subdomains: {} 
        },
        'advanced-math': { 
          correct: 0, 
          total: 0, 
          accuracy: 0,
          subdomains: {} 
        },
        'problem-solving-data': { 
          correct: 0, 
          total: 0, 
          accuracy: 0,
          subdomains: {} 
        },
        'geometry-trigonometry': { 
          correct: 0, 
          total: 0, 
          accuracy: 0,
          subdomains: {} 
        },
      }
    };

    // Enhanced topic to domain mapping
    const topicToDomain: { [key: string]: string } = {
      // Reading & Writing topics and subtopics
      'Information and Ideas': 'information-ideas',
      'Central Ideas and Details': 'information-ideas',
      'Command of Evidence: Quantitative': 'information-ideas',
      'Command of Evidence: Textual': 'information-ideas',
      'Inference': 'information-ideas',
      
      'Craft and Structure': 'craft-structure',
      'Cross-Text Connections': 'craft-structure',
      'Text Structure and Purpose': 'craft-structure',
      'Words in Context': 'craft-structure',
      
      'Expression of Ideas': 'expression-ideas',
      'Rhetorical Synthesis': 'expression-ideas',
      'Transitions': 'expression-ideas',
      
      'Standard English Conventions': 'standard-english',
      'Boundaries': 'standard-english',
      'Form, Structure, Sense': 'standard-english',
      
      // Math topics and subtopics
      'Algebra': 'algebra',
      'Linear equations in 1 variable': 'algebra',
      'Linear equations in 2 variables': 'algebra',
      'Linear functions': 'algebra',
      'Systems of 2 linear equations in 2 variables': 'algebra',
      'Linear inequalities in 1 or 2 variables': 'algebra',
      
      'Advanced Math': 'advanced-math',
      'Equivalent expressions': 'advanced-math',
      'Nonlinear equations in 1 variable and systems of equations in 2 variables': 'advanced-math',
      'Nonlinear functions': 'advanced-math',
      
      'Problem-Solving and Data Analysis': 'problem-solving-data',
      'Ratios, rates, proportional relationships, and units': 'problem-solving-data',
      'Percentages': 'problem-solving-data',
      'One-variable data: distributions and measures of center and spread': 'problem-solving-data',
      'Two-variable data: models and scatterplots': 'problem-solving-data',
      'Probability and conditional probability': 'problem-solving-data',
      'Inference from sample statistics and margin of error': 'problem-solving-data',
      'Evaluating statistical claims: observational studies and experiments': 'problem-solving-data',
      
      'Geometry and Trigonometry': 'geometry-trigonometry',
      'Area and volume formulas': 'geometry-trigonometry',
      'Lines, angles, and triangles': 'geometry-trigonometry',
      'Right triangles and trigonometry': 'geometry-trigonometry',
      'Circles': 'geometry-trigonometry',
    };

    // Process the data
    data?.forEach((attempt: any) => {
      const question = attempt.questions;
      if (!question) return;

      const subject = question.subject;
      const topic = question.topic;
      const subtopic = question.subtopic;
      
      // Map topic/subtopic to domain
      const domain = topicToDomain[subtopic] || 
                    topicToDomain[topic] || 
                    topicToDomain[topic?.toLowerCase()] || 
                    (subject === 'math' ? 'algebra' : 'information-ideas'); // fallback

      if (subject in progress && domain in progress[subject]) {
        const sectionProgress = progress[subject];
        const domainProgress = sectionProgress[domain];
        
        // Update domain totals
        domainProgress.total += 1;
        if (attempt.is_correct) {
          domainProgress.correct += 1;
        }
        
        // Update subdomain if available
        if (subtopic) {
          if (!domainProgress.subdomains[subtopic]) {
            domainProgress.subdomains[subtopic] = { correct: 0, total: 0, accuracy: 0 };
          }
          
          domainProgress.subdomains[subtopic].total += 1;
          if (attempt.is_correct) {
            domainProgress.subdomains[subtopic].correct += 1;
          }
        }
      }
    });

    // Calculate accuracy percentages
    (['reading-writing', 'math'] as const).forEach(sectionKey => {
      const section = progress[sectionKey];
      Object.keys(section).forEach(domainKey => {
        const domain = section[domainKey];
        domain.accuracy = domain.total > 0 ? Math.round((domain.correct / domain.total) * 100) : 0;
        
        Object.keys(domain.subdomains).forEach(subdomainKey => {
          const subdomain = domain.subdomains[subdomainKey];
          subdomain.accuracy = subdomain.total > 0 ? Math.round((subdomain.correct / subdomain.total) * 100) : 0;
        });
      });
    });

    return progress;
  },
}; 