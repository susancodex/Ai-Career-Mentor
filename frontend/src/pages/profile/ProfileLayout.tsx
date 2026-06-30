import { NavLink, Outlet } from 'react-router-dom';
import {
  User, Camera, Lock, Bell, Palette, Trash2,
} from 'lucide-react';

const subNav = [
  { to: '/profile/settings',      label: 'General Info',    icon: User     },
  { to: '/profile/avatar',        label: 'Profile Photo',   icon: Camera   },
  { to: '/profile/security',      label: 'Security',        icon: Lock     },
  { to: '/profile/notifications', label: 'Notifications',   icon: Bell     },
  { to: '/profile/appearance',    label: 'Appearance',      icon: Palette  },
  { to: '/profile/danger',        label: 'Danger Zone',     icon: Trash2,
    danger: true },
];

export function ProfileLayout() {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Profile &amp; Settings
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Manage your account, security, and preferences.
        </p>
      </div>

      {/* Mobile horizontal sub-nav */}
      <nav
        className="flex sm:hidden overflow-x-auto gap-1 pb-2 mb-5 -mx-4 px-4"
        aria-label="Profile sections"
      >
        {subNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                isActive
                  ? item.danger
                    ? 'bg-red-100 text-red-700'
                    : 'bg-teal-50 text-teal-700'
                  : item.danger
                    ? 'text-red-500 hover:bg-red-50'
                    : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex gap-8">
        {/* Desktop sidebar sub-nav */}
        <aside className="hidden sm:flex flex-col gap-0.5 w-48 shrink-0">
          {subNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? item.danger
                      ? 'bg-red-50 text-red-700'
                      : 'bg-teal-50 text-teal-700'
                    : item.danger
                      ? 'text-red-500 hover:bg-red-50'
                      : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </aside>

        {/* Sub-page content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
