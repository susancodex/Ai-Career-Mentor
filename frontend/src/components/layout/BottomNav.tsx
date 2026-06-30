import { NavLink } from 'react-router-dom';
import { Home, FileText, Sparkles, Briefcase, User } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Home',    icon: Home      },
  { path: '/resume',    label: 'Resume',  icon: FileText  },
  { path: '/chat',      label: 'Chat',    icon: Sparkles  },
  { path: '/jobs',      label: 'Jobs',    icon: Briefcase },
  { path: '/profile',   label: 'Profile', icon: User      },
];

export function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch h-[60px]">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 gap-0.5 min-h-[44px] text-[10px] font-semibold transition-colors ${
                isActive ? 'text-teal-600' : 'text-slate-500 hover:text-slate-700'
              }`
            }
            aria-label={item.label}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-5 h-5 transition-colors ${isActive ? 'text-teal-600' : 'text-slate-400'}`}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
