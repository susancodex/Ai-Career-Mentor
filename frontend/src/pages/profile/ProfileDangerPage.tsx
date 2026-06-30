import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { deleteAccount } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { Card, CardContent } from '../../components/ui/Card';

export function ProfileDangerPage() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { logout: clearAuth } = useAuthStore();

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: () => {
      clearAuth();
      window.location.replace('/login');
    },
    onError: (err: Error) => {
      setError(err.message || 'Incorrect password. Please try again.');
    },
  });

  return (
    <Card className="border-red-200">
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="p-2 rounded-lg bg-red-50 shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Danger Zone</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Irreversible actions — proceed with caution.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
          <div className="flex items-start gap-3">
            <Trash2 className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900">Delete account</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                Permanently delete your account, profile, resumes, and all associated data.
                This cannot be undone.
              </p>

              {!open ? (
                <button
                  onClick={() => setOpen(true)}
                  className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors underline-offset-2 hover:underline"
                >
                  I want to delete my account
                </button>
              ) : (
                <div className="max-w-sm space-y-3">
                  <p className="text-sm font-medium text-red-800">
                    Enter your current password to confirm:
                  </p>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Your current password"
                    className="w-full rounded-lg border border-red-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                    autoFocus
                  />
                  {error && (
                    <p className="text-xs text-red-700 font-medium">{error}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => deleteMutation.mutate()}
                      disabled={!password || deleteMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Delete my account
                    </button>
                    <button
                      onClick={() => { setOpen(false); setPassword(''); setError(''); }}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg border border-slate-300 hover:bg-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
