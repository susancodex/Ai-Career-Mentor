import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { login, register, logout, getProfile } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import type { LoginInput, RegisterInput } from '../lib/zodSchemas';

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, setAuth, logout: clearAuth } = useAuthStore();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.access);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigate('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.access);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigate('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      navigate('/login');
    },
  });

  return {
    user: user || profileQuery.data,
    isAuthenticated,
    isLoading: profileQuery.isLoading,
    login: (data: LoginInput) => loginMutation.mutate(data),
    register: (data: RegisterInput) => registerMutation.mutate(data),
    logout: () => logoutMutation.mutate(),
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
  };
}
