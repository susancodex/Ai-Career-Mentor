import { apiClient } from './client';
import type { LearningRoadmap, LearningResource } from '../types';

export async function generateRoadmap(skillGapId: string): Promise<{ job_id: string }> {
  const response = await apiClient.post('/learning/roadmaps/generate/', { skill_gap_id: skillGapId });
  return response.data;
}

export async function getRoadmaps(): Promise<LearningRoadmap[]> {
  const response = await apiClient.get('/learning/roadmaps/');
  return response.data;
}

export async function updateResource(id: string, completed: boolean): Promise<LearningResource> {
  const response = await apiClient.patch(`/learning/resources/${id}/`, { completed });
  return response.data;
}
