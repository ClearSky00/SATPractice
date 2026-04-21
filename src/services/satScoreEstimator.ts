import { SAT_READING_WRITING_DOMAINS, SAT_MATH_DOMAINS } from '../types';

interface DomainProgress {
  correct: number;
  total: number;
  accuracy?: number;
}

interface SectionProgress {
  [domainId: string]: DomainProgress;
}

interface ProgressData {
  'reading-writing': SectionProgress;
  'math': SectionProgress;
}

interface ScoreEstimate {
  predictedScore: number;
  confidenceRange: {
    min: number;
    max: number;
  };
  sectionScores: {
    readingWriting: number;
    math: number;
  };
  confidence: 'low' | 'medium' | 'high';
  totalQuestions: number;
  overallAccuracy: number;
}

interface DomainScoreBreakdown {
  domainId: string;
  domainName: string;
  accuracy: number;
  weight: number;
  contributionScore: number;
  questionsAnswered: number;
}

interface DetailedScoreEstimate extends ScoreEstimate {
  readingWritingBreakdown: DomainScoreBreakdown[];
  mathBreakdown: DomainScoreBreakdown[];
  recommendations: string[];
}

export class SATScoreEstimator {
  // Official SAT section weights (each section worth 200-800 points)
  private static readonly SECTION_MIN_SCORE = 200;
  private static readonly SECTION_MAX_SCORE = 800;
  private static readonly TOTAL_MIN_SCORE = 400;
  private static readonly TOTAL_MAX_SCORE = 1600;

  // Accuracy to section score mapping (based on real SAT curves)
  private static readonly ACCURACY_TO_SECTION_SCORE = [
    { accuracy: 0, score: 200 },
    { accuracy: 20, score: 280 },
    { accuracy: 30, score: 320 },
    { accuracy: 40, score: 360 },
    { accuracy: 50, score: 420 },
    { accuracy: 60, score: 480 },
    { accuracy: 70, score: 540 },
    { accuracy: 75, score: 580 },
    { accuracy: 80, score: 620 },
    { accuracy: 85, score: 660 },
    { accuracy: 90, score: 710 },
    { accuracy: 95, score: 760 },
    { accuracy: 98, score: 780 },
    { accuracy: 100, score: 800 }
  ];

  /**
   * Estimates SAT score based on user progress data
   */
  static estimateScore(progressData: ProgressData): ScoreEstimate {
    const readingWritingScore = this.calculateSectionScore(
      progressData['reading-writing'],
      SAT_READING_WRITING_DOMAINS
    );
    
    const mathScore = this.calculateSectionScore(
      progressData['math'],
      SAT_MATH_DOMAINS
    );

    const totalScore = readingWritingScore.score + mathScore.score;
    const totalQuestions = readingWritingScore.totalQuestions + mathScore.totalQuestions;
    const overallAccuracy = totalQuestions > 0 ? 
      ((readingWritingScore.totalCorrect + mathScore.totalCorrect) / totalQuestions) * 100 : 0;

    // Calculate confidence based on sample size and consistency
    const confidence = this.calculateConfidence(totalQuestions, progressData);
    
    // Calculate confidence range based on sample size and performance consistency
    const confidenceRange = this.calculateConfidenceRange(
      totalScore,
      totalQuestions,
      confidence
    );

    return {
      predictedScore: Math.round(totalScore),
      confidenceRange,
      sectionScores: {
        readingWriting: Math.round(readingWritingScore.score),
        math: Math.round(mathScore.score)
      },
      confidence,
      totalQuestions,
      overallAccuracy: Math.round(overallAccuracy)
    };
  }

  /**
   * Provides detailed score breakdown with domain analysis
   */
  static getDetailedEstimate(progressData: ProgressData): DetailedScoreEstimate {
    const basicEstimate = this.estimateScore(progressData);
    
    const readingWritingBreakdown = this.getDomainBreakdown(
      progressData['reading-writing'],
      SAT_READING_WRITING_DOMAINS
    );
    
    const mathBreakdown = this.getDomainBreakdown(
      progressData['math'],
      SAT_MATH_DOMAINS
    );

    const recommendations = this.generateRecommendations(
      readingWritingBreakdown,
      mathBreakdown,
      basicEstimate
    );

    return {
      ...basicEstimate,
      readingWritingBreakdown,
      mathBreakdown,
      recommendations
    };
  }

  /**
   * Calculate section score based on domain performance
   */
  private static calculateSectionScore(
    sectionProgress: SectionProgress,
    domains: any[]
  ): { score: number; totalQuestions: number; totalCorrect: number } {
    let weightedAccuracySum = 0;
    let totalWeight = 0;
    let totalQuestions = 0;
    let totalCorrect = 0;

    domains.forEach(domain => {
      const domainProgress = sectionProgress[domain.id];
      if (domainProgress && domainProgress.total > 0) {
        const domainAccuracy = (domainProgress.correct / domainProgress.total) * 100;
        const weight = domain.percentage / 100;
        
        weightedAccuracySum += domainAccuracy * weight;
        totalWeight += weight;
        totalQuestions += domainProgress.total;
        totalCorrect += domainProgress.correct;
      }
    });

    // If no data available, return minimum score
    if (totalWeight === 0) {
      return { score: this.SECTION_MIN_SCORE, totalQuestions: 0, totalCorrect: 0 };
    }

    const weightedAccuracy = weightedAccuracySum / totalWeight;
    const sectionScore = this.accuracyToSectionScore(weightedAccuracy);
    
    // Apply sample size adjustment (less confident with fewer questions)
    const adjustedScore = this.adjustScoreForSampleSize(sectionScore, totalQuestions);

    return { 
      score: Math.max(this.SECTION_MIN_SCORE, Math.min(this.SECTION_MAX_SCORE, adjustedScore)), 
      totalQuestions, 
      totalCorrect 
    };
  }

  /**
   * Convert accuracy percentage to section score using interpolation
   */
  private static accuracyToSectionScore(accuracy: number): number {
    const mapping = this.ACCURACY_TO_SECTION_SCORE;
    
    // Find the two points to interpolate between
    for (let i = 0; i < mapping.length - 1; i++) {
      if (accuracy >= mapping[i].accuracy && accuracy <= mapping[i + 1].accuracy) {
        const lower = mapping[i];
        const upper = mapping[i + 1];
        
        // Linear interpolation
        const ratio = (accuracy - lower.accuracy) / (upper.accuracy - lower.accuracy);
        return lower.score + ratio * (upper.score - lower.score);
      }
    }
    
    // Handle edge cases
    if (accuracy <= mapping[0].accuracy) return mapping[0].score;
    if (accuracy >= mapping[mapping.length - 1].accuracy) return mapping[mapping.length - 1].score;
    
    return this.SECTION_MIN_SCORE;
  }

  /**
   * Adjust score based on sample size (fewer questions = less confidence)
   */
  private static adjustScoreForSampleSize(score: number, questionCount: number): number {
    if (questionCount < 10) {
      // Very few questions - pull toward average (500)
      const pullFactor = 0.3;
      return score * (1 - pullFactor) + 500 * pullFactor;
    } else if (questionCount < 30) {
      // Few questions - slight pull toward average
      const pullFactor = 0.1;
      return score * (1 - pullFactor) + 500 * pullFactor;
    }
    
    // Enough questions for reliable estimate
    return score;
  }

  /**
   * Calculate confidence level based on data quality
   */
  private static calculateConfidence(
    totalQuestions: number,
    progressData: ProgressData
  ): 'low' | 'medium' | 'high' {
    // Check domain coverage
    let domainsWithData = 0;
    const totalDomains = SAT_READING_WRITING_DOMAINS.length + SAT_MATH_DOMAINS.length;
    
    [...SAT_READING_WRITING_DOMAINS, ...SAT_MATH_DOMAINS].forEach(domain => {
      const sectionKey = SAT_READING_WRITING_DOMAINS.includes(domain) ? 'reading-writing' : 'math';
      const domainProgress = progressData[sectionKey][domain.id];
      if (domainProgress && domainProgress.total > 0) {
        domainsWithData++;
      }
    });

    const domainCoverage = domainsWithData / totalDomains;

    if (totalQuestions >= 50 && domainCoverage >= 0.75) return 'high';
    if (totalQuestions >= 20 && domainCoverage >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence range based on score and confidence level
   */
  private static calculateConfidenceRange(
    score: number,
    totalQuestions: number,
    confidence: 'low' | 'medium' | 'high'
  ): { min: number; max: number } {
    let rangeFactor: number;
    
    switch (confidence) {
      case 'high':
        rangeFactor = 0.05; // ±5%
        break;
      case 'medium':
        rangeFactor = 0.08; // ±8%
        break;
      case 'low':
        rangeFactor = 0.12; // ±12%
        break;
    }

    const range = score * rangeFactor;
    return {
      min: Math.max(this.TOTAL_MIN_SCORE, Math.round(score - range)),
      max: Math.min(this.TOTAL_MAX_SCORE, Math.round(score + range))
    };
  }

  /**
   * Get detailed breakdown by domain
   */
  private static getDomainBreakdown(
    sectionProgress: SectionProgress,
    domains: any[]
  ): DomainScoreBreakdown[] {
    return domains.map(domain => {
      const domainProgress = sectionProgress[domain.id] || { correct: 0, total: 0 };
      const accuracy = domainProgress.total > 0 ? 
        Math.round((domainProgress.correct / domainProgress.total) * 100) : 0;
      
      const weight = domain.percentage / 100;
      const contributionScore = this.accuracyToSectionScore(accuracy) * weight;

      return {
        domainId: domain.id,
        domainName: domain.name,
        accuracy,
        weight: domain.percentage,
        contributionScore: Math.round(contributionScore),
        questionsAnswered: domainProgress.total
      };
    });
  }

  /**
   * Generate personalized recommendations
   */
  private static generateRecommendations(
    readingWritingBreakdown: DomainScoreBreakdown[],
    mathBreakdown: DomainScoreBreakdown[],
    estimate: ScoreEstimate
  ): string[] {
    const recommendations: string[] = [];
    const allDomains = [...readingWritingBreakdown, ...mathBreakdown];

    // Find weakest domains
    const weakDomains = allDomains
      .filter(domain => domain.questionsAnswered >= 5) // Only consider domains with enough data
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 2);

    if (weakDomains.length > 0) {
      recommendations.push(
        `Focus on improving your weakest area: ${weakDomains[0].domainName} (${weakDomains[0].accuracy}% accuracy)`
      );
    }

    // Sample size recommendations
    const lowDataDomains = allDomains.filter(domain => domain.questionsAnswered < 10);
    if (lowDataDomains.length > 0) {
      recommendations.push(
        `Practice more questions in: ${lowDataDomains.map(d => d.domainName).join(', ')} for better score accuracy`
      );
    }

    // Score-specific recommendations
    if (estimate.predictedScore < 1200) {
      recommendations.push('Focus on fundamental concepts and easier questions to build confidence');
    } else if (estimate.predictedScore < 1400) {
      recommendations.push('Work on medium difficulty questions and test-taking strategies');
    } else {
      recommendations.push('Practice challenging questions and focus on time management');
    }

    // Confidence recommendations
    if (estimate.confidence === 'low') {
      recommendations.push('Answer more practice questions across all domains for a more accurate score prediction');
    }

    return recommendations;
  }
}

export const satScoreEstimator = SATScoreEstimator; 