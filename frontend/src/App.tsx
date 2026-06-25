import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Dashboard } from './pages/dashboard/Dashboard';
import { ResumePage } from './pages/resume/ResumePage';
import { CareersPage } from './pages/careers/CareersPage';
import { JobsPage } from './pages/jobs/JobsPage';
import { InterviewPage } from './pages/interview/InterviewPage';
import { LearningPage } from './pages/learning/LearningPage';
import { ChatPage } from './pages/chat/ChatPage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { silentRefresh } from './api/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, accessToken, setAccessToken, logout } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !accessToken) {
      silentRefresh().then((access) => {
        if (access) {
          setAccessToken(access);
        } else {
          logout();
        }
      });
    }
    // Intentionally runs once on mount — Zustand store refs are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

function App() {
  const basename = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={basename}>
        <AuthBootstrap>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resume"
              element={
                <ProtectedRoute>
                  <ResumePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/careers"
              element={
                <ProtectedRoute>
                  <CareersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <JobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interview"
              element={
                <ProtectedRoute>
                  <InterviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/learning"
              element={
                <ProtectedRoute>
                  <LearningPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
