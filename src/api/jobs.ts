import { apiClient } from './client';
import type { JobMatch, AsyncJob } from '../types';

export async function generateJobMatches(resumeId: string): Promise<AsyncJob> {
  const response = await apiClient.post('/jobs/matches/generate/', { resume_id: resumeId });
  return response.data;
}

export async function getJobMatches(): Promise<JobMatch[]> {
  const response = await apiClient.get('/jobs/matches/');
  return response.data;
}

export async function updateJobMatch(id: string, status: 'saved' | 'applied' | 'dismissed'): Promise<JobMatch> {
  const response = await apiClient.patch(`/jobs/matches/${id}/`, { status });
  return response.data;
}

export async function getAsyncJobStatus(jobId: string): Promise<{ status: 'pending' | 'done' | 'failed'; result?: unknown }> {
  const response = await apiClient.get(`/jobs/async-status/${jobId}/`);
  return response.data;
}
