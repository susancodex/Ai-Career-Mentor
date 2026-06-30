import { apiClient, API_BASE_URL } from './client';
import axios from 'axios';
import type { User } from '../types';
import type { LoginInput, RegisterInput, ProfileUpdateInput, ChangePasswordInput } from '../lib/zodSchemas';

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

export async function uploadAvatar(payload: {
  cloudinary_url: string;
  cloudinary_public_id: string;
}): Promise<{ avatar_url: string }> {
  const response = await apiClient.post('/me/avatar/', payload);
  return response.data;
}

export async function changePassword(data: ChangePasswordInput): Promise<void> {
  await apiClient.post('/me/password/change/', {
    current_password: data.current_password,
    new_password: data.new_password,
  });
}

export async function deleteAccount(password: string): Promise<void> {
  await apiClient.delete('/me/delete/', { data: { password } });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/password/forgot/', { email });
}

export async function resetPassword(token: string, new_password: string): Promise<void> {
  await apiClient.post('/auth/password/reset/', { token, new_password });
}
