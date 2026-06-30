import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout: clearAuth } = useAuthStore();

  return async function logout() {
    try {
      await apiClient.post('/auth/logout/');
    } catch {
      // Logout must always succeed from the user's perspective,
      // even if the server call fails (expired token, network error, etc.)
    } finally {
      clearAuth();
      queryClient.clear();
      navigate('/login', { replace: true });
    }
  };
}
