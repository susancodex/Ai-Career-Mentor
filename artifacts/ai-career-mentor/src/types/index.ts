export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface Tokens {
  access: string;
  refresh: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  current_role?: string;
  years_experience?: number;
  target_roles?: string[];
  location?: string;
  bio?: string;
}

export interface Resume {
  id: string;
  cloudinary_url: string;
  cloudinary_public_id: string;
  original_filename: string;
  status: 'uploaded' | 'parsing' | 'parsed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface ResumeAnalysis {
  id: string;
  resume_id: string;
  extracted_skills: string[];
  extracted_experience: {
    title: string;
    company: string;
    duration: string;
    description: string;
  }[];
  summary: string;
}

export interface CareerPath {
  id: string;
  title: string;
  description: string;
  reasoning: string;
  match_score: number;
  required_skills: string[];
  timeline_months: number;
  created_at: string;
}

export interface SkillGap {
  id: string;
  resume_id: string;
  target_role: string;
  current_skills: string[];
  missing_skills: string[];
  skill_levels: Record<string, number>;
  created_at: string;
}

export interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  fit_score: number;
  match_reasoning: string;
  salary_range?: string;
  job_url?: string;
  status: 'new' | 'saved' | 'applied' | 'dismissed';
  created_at: string;
}

export interface InterviewSession {
  id: string;
  target_role: string;
  status: 'pending' | 'ready' | 'completed';
  questions: InterviewQuestion[];
  created_at: string;
}

export interface InterviewQuestion {
  id: string;
  session_id: string;
  category: 'behavioral' | 'technical';
  question: string;
  user_answer?: string;
  ai_feedback?: string;
  score?: number;
  created_at: string;
}

export interface LearningRoadmap {
  id: string;
  skill_gap_id: string;
  title: string;
  description: string;
  estimated_hours: number;
  resources: LearningResource[];
  created_at: string;
}

export interface LearningResource {
  id: string;
  roadmap_id: string;
  title: string;
  type: 'course' | 'article' | 'video' | 'project';
  url?: string;
  estimated_hours: number;
  completed: boolean;
  order_index: number;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AsyncJob {
  job_id: string;
  status: 'pending' | 'done' | 'failed';
  result?: unknown;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}
