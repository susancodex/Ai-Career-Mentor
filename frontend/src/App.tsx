import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Dashboard } from './pages/dashboard/Dashboard';
import { ResumePage } from './pages/resume/ResumePage';
import { CareersPage } from './pages/careers/CareersPage';
import { JobsPage } from './pages/jobs/JobsPage';
import { InterviewPage } from './pages/interview/InterviewPage';
import { LearningPage } from './pages/learning/LearningPage';
import { ChatPage } from './pages/chat/ChatPage';
import { ProfileLayout } from './pages/profile/ProfileLayout';
import { ProfileSettingsPage } from './pages/profile/ProfileSettingsPage';
import { ProfileAvatarPage } from './pages/profile/ProfileAvatarPage';
import { ProfileSecurityPage } from './pages/profile/ProfileSecurityPage';
import { ProfileNotificationsPage } from './pages/profile/ProfileNotificationsPage';
import { ProfileAppearancePage } from './pages/profile/ProfileAppearancePage';
import { ProfileDangerPage } from './pages/profile/ProfileDangerPage';
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
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes — ProtectedRoute wraps with DashboardLayout */}
            <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/resume"     element={<ProtectedRoute><ResumePage /></ProtectedRoute>} />
            <Route path="/careers"    element={<ProtectedRoute><CareersPage /></ProtectedRoute>} />
            <Route path="/jobs"       element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
            <Route path="/interview"  element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
            <Route path="/learning"   element={<ProtectedRoute><LearningPage /></ProtectedRoute>} />
            <Route path="/chat"       element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

            {/* Profile sub-routes — nested under ProfileLayout */}
            <Route
              path="/profile"
              element={<ProtectedRoute><ProfileLayout /></ProtectedRoute>}
            >
              <Route index element={<Navigate to="settings" replace />} />
              <Route path="settings"      element={<ProfileSettingsPage />} />
              <Route path="avatar"        element={<ProfileAvatarPage />} />
              <Route path="security"      element={<ProfileSecurityPage />} />
              <Route path="notifications" element={<ProfileNotificationsPage />} />
              <Route path="appearance"    element={<ProfileAppearancePage />} />
              <Route path="danger"        element={<ProfileDangerPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
