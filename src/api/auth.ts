import { apiClient } from './client';
import type { User, Tokens } from '../types';
import type { LoginInput, RegisterInput, ProfileUpdateInput } from '../lib/zodSchemas';

export async function login(data: LoginInput): Promise<{ user: User; tokens: Tokens }> {
  const response = await apiClient.post('/auth/login/', data);
  return response.data;
}

export async function register(data: RegisterInput): Promise<{ user: User; tokens: Tokens }> {
  const response = await apiClient.post('/auth/register/', data);
  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout/');
}

export async function getProfile(): Promise<User> {
  const response = await apiClient.get('/me/');
  return response.data;
}

export async function updateProfile(data: ProfileUpdateInput): Promise<User> {
  const response = await apiClient.patch('/me/', data);
  return response.data;
}
