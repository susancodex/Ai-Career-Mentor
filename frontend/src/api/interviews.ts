import { apiClient } from './client';
import type { InterviewSession } from '../types';

export async function createInterviewSession(targetRole: string): Promise<InterviewSession> {
  const response = await apiClient.post('/interviews/sessions/', { target_role: targetRole });
  return response.data;
}

export async function generateQuestions(sessionId: string): Promise<{ job_id: string }> {
  const response = await apiClient.post(`/interviews/sessions/${sessionId}/questions/generate/`);
  return response.data;
}

export async function getInterviewSession(sessionId: string): Promise<InterviewSession> {
  const response = await apiClient.get(`/interviews/sessions/${sessionId}/`);
  return response.data;
}

export async function submitAnswer(questionId: string, userAnswer: string): Promise<{
  ai_feedback: string;
  score: number;
  strengths: string[];
  improvements: string[];
}> {
  const response = await apiClient.post(`/interviews/questions/${questionId}/answer/`, { user_answer: userAnswer });
  return response.data;
}
