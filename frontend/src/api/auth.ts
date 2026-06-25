import { apiClient, API_BASE_URL } from './client';
import axios from 'axios';
import type { User } from '../types';
import type { LoginInput, RegisterInput, ProfileUpdateInput } from '../lib/zodSchemas';

export interface AuthResponse {
  user: User;
  access: string;
}

export async function login(data: LoginInput): Promise<AuthResponse> {
  const response = await apiClient.post('/auth/login/', data);
  return response.data;
}

export async function register(data: RegisterInput): Promise<AuthResponse> {
  const response = await apiClient.post('/auth/register/', data);
  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout/');
}

export async function silentRefresh(): Promise<string | null> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh/`,
      {},
      { withCredentials: true }
    );
    return (response.data as { access: string }).access;
  } catch {
    return null;
  }
}

export async function getProfile(): Promise<User> {
  const response = await apiClient.get('/me/');
  return response.data;
}

export async function updateProfile(data: ProfileUpdateInput): Promise<User> {
  const response = await apiClient.patch('/me/', data);
  return response.data;
}
