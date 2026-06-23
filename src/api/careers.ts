import { apiClient } from './client';
import type { CareerPath, SkillGap, AsyncJob } from '../types';

export async function generateCareerPaths(resumeId: string, targetRole?: string): Promise<AsyncJob> {
  const response = await apiClient.post('/careers/paths/generate/', { resume_id: resumeId, target_role: targetRole });
  return response.data;
}

export async function getCareerPaths(): Promise<CareerPath[]> {
  const response = await apiClient.get('/careers/paths/');
  return response.data;
}

export async function getSkillGaps(resumeId: string, targetRole?: string): Promise<SkillGap> {
  const response = await apiClient.get(`/careers/skill-gaps/${resumeId}/`, {
    params: targetRole ? { target_role: targetRole } : undefined,
  });
  return response.data;
}
