import { apiClient } from './client';
import type { Resume, ResumeAnalysis } from '../types';
import type { ResumeUploadInput } from '../lib/zodSchemas';

export async function uploadResume(data: ResumeUploadInput): Promise<Resume> {
  const response = await apiClient.post('/resumes/', data);
  return response.data;
}

export async function getResumes(): Promise<Resume[]> {
  const response = await apiClient.get('/resumes/');
  return response.data;
}

export async function getResume(id: string): Promise<Resume> {
  const response = await apiClient.get(`/resumes/${id}/`);
  return response.data;
}

export async function getResumeAnalysis(id: string): Promise<ResumeAnalysis> {
  const response = await apiClient.get(`/resumes/${id}/analysis/`);
  return response.data;
}
