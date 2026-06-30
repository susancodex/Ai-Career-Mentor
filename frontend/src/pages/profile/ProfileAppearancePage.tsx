import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Save, CheckCircle, AlertCircle, Palette, Sun, Moon, Monitor } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getProfile, updateProfile } from '../../api/auth';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium border ${
        type === 'success'
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-red-50 text-red-800 border-red-200'
      }`}
    >
      {type === 'success'
        ? <CheckCircle className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />}
      {message}
    </motion.div>
  );
}

const themeOptions = [
  { value: 'light',  label: 'Light',  icon: Sun,     desc: 'Clean white interface' },
  { value: 'dark',   label: 'Dark',   icon: Moon,    desc: 'Easy on the eyes at night' },
  { value: 'system', label: 'System', icon: Monitor, desc: 'Matches your OS setting' },
] as const;

type Theme = 'light' | 'dark' | 'system';

export function ProfileAppearancePage() {
  const queryClient = useQueryClient();
  const { setAuth, accessToken } = useAuthStore();
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: user } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
  });

  const [theme, setTheme] = useState<Theme>(user?.profile?.theme_preference || 'system');

  const saveMutation = useMutation({
    mutationFn: () => updateProfile({ theme_preference: theme }),
    onSuccess: async (updated) => {
      if (accessToken) setAuth(updated, accessToken);
      queryClient.setQueryData(['profile'], updated);
      setSavedMsg('Appearance saved.');
      setErrorMsg('');
      setTimeout(() => setSavedMsg(''), 3000);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Failed to save appearance.');
    },
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="p-2 rounded-lg bg-teal-50 shrink-0">
            <Palette className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Appearance</h2>
            <p className="text-sm text-slate-500 mt-0.5">Choose how the app looks for you.</p>
          </div>
        </div>

        {savedMsg && <div className="mb-4"><Alert type="success" message={savedMsg} /></div>}
        {errorMsg && <div className="mb-4"><Alert type="error" message={errorMsg} /></div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const selected = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                  selected
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-6 h-6 ${selected ? 'text-teal-600' : 'text-slate-400'}`} />
                <div>
                  <p className={`text-sm font-semibold ${selected ? 'text-teal-700' : 'text-slate-700'}`}>{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
                {selected && (
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 mb-5">
          Note: Dark mode is saved to your profile but not yet applied globally — full theming is coming soon.
        </p>

        <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending} className="min-w-[140px]">
          <Save className="w-4 h-4 mr-2" />
          Save appearance
        </Button>
      </CardContent>
    </Card>
  );
}
