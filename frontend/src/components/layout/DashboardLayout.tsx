import { NavLink, useLocation } from 'react-router-dom';
import {
  FileText,
  Compass,
  Briefcase,
  MessageSquare,
  BookOpen,
  GraduationCap,
  LogOut,
  Sparkles,
  Settings,
} from 'lucide-react';
import { useEffect } from 'react';
import { useLogout } from '../../hooks/useLogout';
import { useAuthStore } from '../../store/authStore';
import { motion } from 'framer-motion';
import { BottomNav } from './BottomNav';
import type { Profile } from '../../types';

const navItems = [
  { to: '/dashboard', label: 'Overview',       icon: Compass       },
  { to: '/resume',    label: 'Resume Profile', icon: FileText      },
  { to: '/careers',   label: 'Path Explorer',  icon: GraduationCap },
  { to: '/jobs',      label: 'Job Matches',    icon: Briefcase     },
  { to: '/interview', label: 'Interview Prep', icon: MessageSquare },
  { to: '/learning',  label: 'Skill Builder',  icon: BookOpen      },
  { to: '/chat',      label: 'AI Coach',       icon: Sparkles      },
];

function UserAvatar({ profile, fullName }: { profile?: Profile; fullName?: string }) {
  const initials = (fullName || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={fullName}
        className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-700"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-teal-700 flex items-center justify-center shrink-0 text-sm font-bold text-white">
      {initials}
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const logout = useLogout();
  const { user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // close any open drawers on route change (no-op now — kept for future use)
  }, [location.pathname]);

  const profile = user?.profile;

  return (
    <div className="min-h-[100dvh] bg-background flex w-full overflow-hidden text-slate-900">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-sidebar-bg border-r border-sidebar-border fixed h-full z-20 text-sidebar-fg transition-all">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">Career Mentor</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'text-white bg-sidebar-accent'
                    : 'text-slate-400 hover:text-white hover:bg-sidebar-accent/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 w-1 h-5 bg-primary rounded-r-full"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border bg-sidebar-bg/50 space-y-2">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-sidebar-accent text-white'
                  : 'hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <UserAvatar profile={profile} fullName={user?.full_name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-white">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                <Settings className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-slate-500'}`} />
              </>
            )}
          </NavLink>

          <button
            onClick={() => logout()}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top header — brand only; navigation is via BottomNav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center px-4 py-3 gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Career Mentor</h1>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-[280px] pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen relative">
        <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] mix-blend-overlay" />
        <div className="max-w-5xl mx-auto p-4 md:p-8 lg:p-10 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile bottom navigation — hidden on desktop */}
      <BottomNav />
    </div>
  );
}
