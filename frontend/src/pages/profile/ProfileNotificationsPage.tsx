import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Save, CheckCircle, AlertCircle, Bell } from 'lucide-react';
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

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${checked ? 'bg-teal-600' : 'bg-slate-300'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
}

export function ProfileNotificationsPage() {
  const queryClient = useQueryClient();
  const { setAuth, accessToken } = useAuthStore();
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: user } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
  });

  const [emailEnabled, setEmailEnabled] = useState(
    user?.profile?.email_notifications_enabled ?? true
  );

  const saveMutation = useMutation({
    mutationFn: () => updateProfile({ email_notifications_enabled: emailEnabled }),
    onSuccess: async (updated) => {
      if (accessToken) setAuth(updated, accessToken);
      queryClient.setQueryData(['profile'], updated);
      setSavedMsg('Notification preferences saved.');
      setErrorMsg('');
      setTimeout(() => setSavedMsg(''), 3000);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Failed to save preferences.');
    },
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="p-2 rounded-lg bg-teal-50 shrink-0">
            <Bell className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Email notifications</h2>
            <p className="text-sm text-slate-500 mt-0.5">Choose which updates you want to receive by email.</p>
          </div>
        </div>

        {savedMsg && <div className="mb-4"><Alert type="success" message={savedMsg} /></div>}
        {errorMsg && <div className="mb-4"><Alert type="error" message={errorMsg} /></div>}

        <div className="divide-y divide-slate-100">
          <Toggle
            checked={emailEnabled}
            onChange={setEmailEnabled}
            label="Career updates"
            description="New job matches, career path suggestions, and weekly progress summaries."
          />
          <Toggle
            checked={emailEnabled}
            onChange={setEmailEnabled}
            label="Resume analysis complete"
            description="Get notified when your resume has been parsed and analysed."
          />
          <Toggle
            checked={emailEnabled}
            onChange={setEmailEnabled}
            label="AI Coach recommendations"
            description="Periodic tips and skill-building recommendations from your AI Coach."
          />
        </div>

        <div className="mt-6">
          <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending} className="min-w-[160px]">
            <Save className="w-4 h-4 mr-2" />
            Save preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
