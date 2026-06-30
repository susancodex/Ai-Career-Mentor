import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { changePassword } from '../../api/auth';
import { changePasswordSchema, type ChangePasswordInput } from '../../lib/zodSchemas';
import { Input } from '../../components/ui/Input';
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

export function ProfileSecurityPage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const changeMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      reset();
      setSavedMsg('Password changed successfully.');
      setErrorMsg('');
      setTimeout(() => setSavedMsg(''), 4000);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Failed to change password. Check your current password.');
      setSavedMsg('');
    },
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 rounded-lg bg-teal-50 shrink-0">
              <Shield className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Change password</h2>
              <p className="text-sm text-slate-500 mt-0.5">Choose a strong password of at least 8 characters.</p>
            </div>
          </div>

          {savedMsg && <div className="mb-4"><Alert type="success" message={savedMsg} /></div>}
          {errorMsg && <div className="mb-4"><Alert type="error" message={errorMsg} /></div>}

          <form onSubmit={handleSubmit((data) => changeMutation.mutate(data))} className="space-y-4 max-w-sm">
            <div className="relative">
              <Input
                label="Current password"
                type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.current_password?.message}
                {...register('current_password')}
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-9 text-slate-400 hover:text-slate-600">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="New password"
                type={showNew ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.new_password?.message}
                {...register('new_password')}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-9 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirm new password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.confirm_password?.message}
                {...register('confirm_password')}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-9 text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="pt-1">
              <Button type="submit" isLoading={changeMutation.isPending} className="min-w-[160px]">
                <Lock className="w-4 h-4 mr-2" />
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Two-factor authentication</h2>
          <p className="text-sm text-slate-500">
            2FA is coming soon. You'll be able to add an authenticator app for extra security.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span className="text-xs font-medium text-amber-700">Coming soon</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
