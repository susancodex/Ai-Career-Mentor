import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Sparkles, CheckCircle } from 'lucide-react';
import { resetPassword } from '../../api/auth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const schema = z.object({
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(8, 'Confirm your password'),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});
type FormData = z.infer<typeof schema>;

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => resetPassword(token, data.new_password),
    onSuccess: () => {
      setTimeout(() => navigate('/login'), 2500);
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center shadow-xl">
          <p className="text-slate-500 text-sm mb-4">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-sm font-semibold text-teal-700 hover:text-teal-600">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center shadow-xl"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Password reset!</h2>
          <p className="text-slate-500 text-sm">You'll be redirected to sign in shortly...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#0d9488' }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">Career Mentor</span>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Set new password</h2>
          <p className="text-slate-500 text-sm">Choose a strong password of at least 8 characters.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8">
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
            <div className="relative">
              <Input
                label="New password"
                type={showNew ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.new_password?.message}
                {...register('new_password')}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              >
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
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mutation.isError && (
              <div className="text-sm text-red-700 font-medium bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                {(mutation.error as Error)?.message || 'Invalid or expired token.'}
              </div>
            )}
            <Button type="submit" isLoading={mutation.isPending} className="w-full h-11 text-[15px] font-semibold">
              Reset password
            </Button>
          </form>
        </div>

        <p className="mt-6 text-sm text-center text-slate-500">
          <Link to="/login" className="font-semibold text-teal-700 hover:text-teal-600 transition-colors">
            ← Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
