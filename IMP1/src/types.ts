export type InterviewRole = string;

export interface InterviewQuestion {
  id: string;
  text: string;
  category: 'technical' | 'behavioral' | 'situational';
}

export interface InterviewResponse {
  questionId: string;
  answer: string;
  evaluation?: ResponseEvaluation;
}

export interface ResponseEvaluation {
  score: number; // 0-100
  communication: number; // 0-100
  confidence: number; // 0-100
  confidenceScore: number; // 0-100 (New field requested)
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface InterviewSession {
  id: string;
  role: InterviewRole;
  difficulty: 'entry' | 'mid' | 'senior';
  questions: InterviewQuestion[];
  responses: InterviewResponse[];
  currentQuestionIndex: number;
  status: 'setup' | 'interviewing' | 'evaluating' | 'completed';
}

export interface OverallEvaluation {
  overallScore: number;
  communicationScore: number;
  confidenceScore: number;
  technicalScore: number;
  summary: string;
  keyTakeaways: string[];
}

export interface UserProfile {
  name: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  targetRole?: string;
}
