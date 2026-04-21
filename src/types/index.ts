export interface User {
  id: string;
  email: string;
  name?: string;
  isPremium: boolean;
  createdAt: string;
}

export interface Question {
  id: string;
  section: 'reading-writing' | 'math';
  domain: string;
  subdomain: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  isPremium: boolean;
}

export interface TestSession {
  id: string;
  userId: string;
  questions: Question[];
  answers: number[];
  score: number;
  totalQuestions: number;
  completedAt: string;
  section: string;
  domain: string;
  subdomain?: string;
}

export interface Progress {
  userId: string;
  totalQuestions: number;
  correctAnswers: number;
  // Reading & Writing scores
  informationIdeasScore: number;
  craftStructureScore: number;
  expressionIdeasScore: number;
  standardEnglishScore: number;
  // Math scores
  algebraScore: number;
  advancedMathScore: number;
  problemSolvingDataScore: number;
  geometryTrigonometryScore: number;
  lastUpdated: string;
}

export interface Domain {
  id: string;
  name: string;
  percentage: number;
  subdomains: string[];
}

export const SAT_READING_WRITING_DOMAINS: Domain[] = [
  {
    id: 'information-ideas',
    name: 'Information and Ideas',
    percentage: 26,
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
    subdomains: [
      'Rhetorical Synthesis',
      'Transitions'
    ]
  },
  {
    id: 'standard-english',
    name: 'Standard English Conventions',
    percentage: 26,
    subdomains: [
      'Boundaries',
      'Form, Structure, Sense'
    ]
  }
];

export const SAT_MATH_DOMAINS: Domain[] = [
  {
    id: 'algebra',
    name: 'Algebra',
    percentage: 35,
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
    subdomains: [
      'Area and volume formulas',
      'Lines, angles, and triangles',
      'Right triangles and trigonometry',
      'Circles'
    ]
  }
]; 