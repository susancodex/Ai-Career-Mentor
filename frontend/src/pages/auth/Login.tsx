import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loginSchema, type LoginInput } from '../../lib/zodSchemas';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Sparkles, TrendingUp, Target, Zap } from 'lucide-react';

const features = [
  { icon: TrendingUp, text: 'AI-powered career path analysis' },
  { icon: Target, text: 'Skill gap identification & roadmaps' },
  { icon: Zap, text: 'Real-time job match scoring' },
];

export function Login() {
  const { login, loginError, isLoginLoading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginInput) => {
    login(data);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left branding panel */}
      <div
        className="hidden md:flex flex-1 items-center justify-center p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0f766e 0%, #0d9488 50%, #134e4a 100%)' }}
      >
        {/* Background texture */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '48px 48px' }}
        />
        {/* Glowing orb */}
        <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #5eead4, transparent)' }}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 max-w-md"
        >
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Career Mentor</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Accelerate your career with AI
          </h1>
          <p className="text-teal-100 text-lg leading-relaxed mb-10">
            Get personalized career insights, skill gap analysis, and job matches — all powered by AI trained on real career trajectories.
          </p>
          <div className="space-y-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <f.icon className="w-4 h-4 text-teal-200" />
                </div>
                <span className="text-teal-50 text-sm font-medium">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-slate-50">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2 justify-center mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#0d9488' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">Career Mentor</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500">Sign in to continue to your dashboard.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />
              {loginError && (
                <div className="flex items-start gap-2 text-sm text-red-700 font-medium bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                  {loginError instanceof Error ? loginError.message : 'Invalid email or password'}
                </div>
              )}
              <Button type="submit" isLoading={isLoginLoading} className="w-full h-11 text-[15px] font-semibold mt-1">
                Sign in
              </Button>
            </form>
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            <Link to="/forgot-password" className="text-sm font-medium text-slate-500 hover:text-teal-700 transition-colors">
              Forgot your password?
            </Link>
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-teal-700 hover:text-teal-600 transition-colors">
                Create one for free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
