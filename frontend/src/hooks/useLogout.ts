import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { logout as apiLogout } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export function useLogout() {
  const navigate = useNavigate();
  const { logout: clearAuth } = useAuthStore();

  const logoutMutation = useMutation({
    mutationFn: apiLogout,
    onSuccess: () => {
      clearAuth();
      navigate('/login', { replace: true });
    },
  });

  return async function logout() {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Logout must always succeed from the user's perspective,
      // even if the server call fails
      clearAuth();
      navigate('/login', { replace: true });
    }
  };
}
