import { supabase } from '../config/supabase';
import { localStorageService } from './localStorageService';
import { questionLimitService, QuestionLimitStatus } from './questionLimitService';

export interface QuestionGenerationRequest {
  section: 'math' | 'reading-writing';
  topic: string;
  subtopic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count?: number;
}

export interface GeneratedQuestion {
  id?: string;
  question_text: string;
  subject: string;
  topic: string;
  subtopic?: string;
  difficulty: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation_choice_a: string;
  explanation_choice_b: string;
  explanation_choice_c: string;
  explanation_choice_d: string;
  hint: string;
  created_by_ai?: boolean;
  created_at?: string;
}

export interface QuestionGenerationResponse {
  questions: GeneratedQuestion[];
  usage: {
    questionsUsed: number;
    monthlyLimit: number;
    remaining: number;
  };
}

export interface QuestionGenerationError {
  error: string;
  details?: string;
  questionsUsed?: number;
  monthlyLimit?: number;
}

// Custom error classes for better error handling
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required. Please log in to continue.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed. Please check your internet connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class QuestionGenerationServiceError extends Error {
  constructor(message: string = 'Failed to fetch questions. Please try again.') {
    super(message);
    this.name = 'QuestionGenerationServiceError';
  }
}

export class QuestionLimitReachedError extends Error {
  constructor(message: string, public limitStatus: QuestionLimitStatus) {
    super(message);
    this.name = 'QuestionLimitReachedError';
  }
}

class QuestionGenerationService {
  /**
   * Updated to work with both authenticated and anonymous users.
   * - Authenticated users: Questions filtered by database attempts
   * - Anonymous users: Questions filtered by local storage attempts
   * - No AI generation - pulls from existing question database
   */
  /**
   * Ensure user exists in users table
   */
  private async ensureUserExists(): Promise<boolean> {
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
  }

  /**
   * Get questions from database that user hasn't seen yet
   * Works for both authenticated and anonymous users
   */
  async generateQuestions(
    request: QuestionGenerationRequest
  ): Promise<QuestionGenerationResponse> {
    try {
      // Get the current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      const userId = session?.user?.id;
      const isAuthenticated = !sessionError && !!userId;

      // Check daily question limit BEFORE generating questions
      const limitStatus = await questionLimitService.checkQuestionLimit(userId);
      
      if (!limitStatus.canGenerate && !limitStatus.isPremium) {
        // Throw a specific error that indicates limit reached
        throw new QuestionLimitReachedError(
          `Daily question limit reached (${limitStatus.questionsUsedToday}/${limitStatus.dailyLimit}). Upgrade to premium for unlimited questions.`,
          limitStatus
        );
      }

      // Validate request
      this.validateRequest(request);

      // Ensure user exists only for authenticated users
      if (isAuthenticated) {
        const userExists = await this.ensureUserExists();
        if (!userExists) {
          throw new QuestionGenerationServiceError('Failed to ensure user exists in database');
        }
      }

      const count = request.count || 1;

      // Get questions that match the criteria
      let query = supabase
        .from('questions')
        .select('*')
        .eq('subject', request.section)
        .eq('difficulty', request.difficulty);

      // Add topic filter
      if (request.topic) {
        query = query.eq('topic', request.topic);
      }

      // Add subtopic filter if specified
      if (request.subtopic) {
        query = query.eq('subtopic', request.subtopic);
      }

      // Get all matching questions first
      const { data: allQuestions, error: questionsError } = await query;

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        throw new QuestionGenerationServiceError('Failed to fetch questions from database');
      }

      if (!allQuestions || allQuestions.length === 0) {
        throw new QuestionGenerationServiceError('No questions available for the selected criteria');
      }

      let seenQuestionIds = new Set<string>();

      if (isAuthenticated) {
        // For authenticated users, get questions already seen from database
        const { data: attemptedQuestions } = await supabase
          .from('user_attempts')
          .select('question_id')
          .eq('user_id', userId);

        seenQuestionIds = new Set(attemptedQuestions?.map(attempt => attempt.question_id) || []);
      } else {
        // For anonymous users, get questions already seen from local storage
        const localAttempts = await localStorageService.getUserAttempts();
        seenQuestionIds = new Set(localAttempts.map(attempt => attempt.question_id));
      }

      // Filter out seen questions
      const unseenQuestions = allQuestions.filter(question => !seenQuestionIds.has(question.id));

      // If no unseen questions, allow repeating questions for practice
      const availableQuestions = unseenQuestions.length > 0 ? unseenQuestions : allQuestions;

      if (availableQuestions.length === 0) {
        throw new QuestionGenerationServiceError('No questions available for the selected criteria');
      }

      // Randomize and take requested count
      const shuffled = availableQuestions.sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, count);

      // Transform to match expected format
      const formattedQuestions: GeneratedQuestion[] = selectedQuestions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        subject: q.subject,
        topic: q.topic,
        subtopic: q.subtopic,
        difficulty: q.difficulty,
        choice_a: q.choice_a,
        choice_b: q.choice_b,
        choice_c: q.choice_c,
        choice_d: q.choice_d,
        correct_answer: q.correct_answer,
        explanation_choice_a: q.explanation_choice_a,
        explanation_choice_b: q.explanation_choice_b,
        explanation_choice_c: q.explanation_choice_c,
        explanation_choice_d: q.explanation_choice_d,
        hint: q.hint || '',
        created_by_ai: false,
        created_at: q.created_at
      }));

      // Return with actual usage data from the limit service
      return {
        questions: formattedQuestions,
        usage: {
          questionsUsed: limitStatus.questionsUsedToday,
          monthlyLimit: limitStatus.dailyLimit,
          remaining: limitStatus.questionsRemaining
        }
      };

    } catch (error) {
      if (error instanceof QuestionGenerationServiceError || error instanceof QuestionLimitReachedError) {
        throw error;
      }
      console.error('Error in generateQuestions:', error);
      throw new QuestionGenerationServiceError('Failed to fetch questions');
    }
  }

  /**
   * Get current user usage data (updated to reflect actual limits)
   * Works for both authenticated and anonymous users
   */
  async getUserUsage(): Promise<{ questionsUsed: number; monthlyLimit: number; remaining: number } | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      const limitStatus = await questionLimitService.checkQuestionLimit(userId);
      
      return {
        questionsUsed: limitStatus.questionsUsedToday,
        monthlyLimit: limitStatus.dailyLimit,
        remaining: limitStatus.questionsRemaining
      };
    } catch (error) {
      console.error('Error getting user usage:', error);
      return null;
    }
  }

  /**
   * Check if user can generate questions (updated with limit checking)
   * Works for both authenticated and anonymous users
   */
  async canGenerateQuestions(count: number = 1): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      const limitStatus = await questionLimitService.checkQuestionLimit(userId);
      return limitStatus.canGenerate;
    } catch (error) {
      console.error('Error checking if can generate questions:', error);
      return false;
    }
  }

  private validateRequest(request: QuestionGenerationRequest): void {
    if (!request.section || !['math', 'reading-writing'].includes(request.section)) {
      throw new QuestionGenerationServiceError('Valid section (math or reading-writing) is required');
    }

    if (!request.topic || request.topic.trim() === '') {
      throw new QuestionGenerationServiceError('Topic is required');
    }

    if (!request.difficulty || !['easy', 'medium', 'hard'].includes(request.difficulty)) {
      throw new QuestionGenerationServiceError('Valid difficulty (easy, medium, or hard) is required');
    }

    const count = request.count || 1;
    if (count < 1 || count > 10) {
      throw new QuestionGenerationServiceError('Count must be between 1 and 10');
    }
  }
}

// Export singleton instance
export const questionGenerationService = new QuestionGenerationService(); 