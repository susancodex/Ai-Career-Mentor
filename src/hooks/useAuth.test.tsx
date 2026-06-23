import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { useAuthStore } from '../store/authStore';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
};

describe('useAuth', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('should return unauthenticated state initially', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should update auth state on login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    result.current.login({ email: 'test@example.com', password: 'password123' });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).not.toBeNull();
  });
});
