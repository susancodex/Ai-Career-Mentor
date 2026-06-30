import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPassword } from '../../api/auth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Sparkles, CheckCircle, Mail } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type FormData = z.infer<typeof schema>;

export function ForgotPassword() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => forgotPassword(data.email),
  });

  if (mutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-10 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Check your email</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              If an account with that email exists, we've sent a password reset link. The link expires in 1 hour.
            </p>
            <Link
              to="/login"
              className="inline-block mt-6 text-sm font-semibold text-teal-700 hover:text-teal-600 transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
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
          <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Forgot your password?</h2>
          <p className="text-slate-500 text-sm">Enter your email and we'll send you a reset link.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8">
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            {mutation.isError && (
              <div className="text-sm text-red-700 font-medium bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                Something went wrong. Please try again.
              </div>
            )}
            <Button type="submit" isLoading={mutation.isPending} className="w-full h-11 text-[15px] font-semibold">
              Send reset link
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
