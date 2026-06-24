import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { registerSchema, type RegisterInput } from '../../lib/zodSchemas';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Sparkles, Users, Shield, BarChart3 } from 'lucide-react';

const highlights = [
  { icon: Users, text: 'Join ambitious professionals leveling up their careers' },
  { icon: BarChart3, text: 'Data-driven career path scoring and skill gap maps' },
  { icon: Shield, text: 'Your data is private and never shared' },
];

export function Register() {
  const { register: registerUser, registerError, isRegisterLoading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterInput) => {
    registerUser(data);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row-reverse">
      {/* Right branding panel */}
      <div
        className="hidden md:flex flex-1 items-center justify-center p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #0d9488, transparent)' }}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 max-w-md"
        >
          <div className="flex items-center gap-3 mb-10">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(13,148,136,0.2)', border: '1px solid rgba(13,148,136,0.3)' }}
            >
              <Sparkles className="w-6 h-6" style={{ color: '#5eead4' }} />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Career Mentor</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Your career, accelerated
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-10">
            Upload your resume, get AI-powered career recommendations, and track your growth — all in one place.
          </p>
          <div className="space-y-4">
            {highlights.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.2)' }}
                >
                  <h.icon className="w-4 h-4" style={{ color: '#5eead4' }} />
                </div>
                <span className="text-slate-300 text-sm font-medium">{h.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Left form panel */}
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
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Create your account</h2>
            <p className="text-slate-500">Start your career journey — it's free.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Full name"
                type="text"
                placeholder="Jane Doe"
                error={errors.full_name?.message}
                {...register('full_name')}
              />
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
              {registerError && (
                <div className="text-sm text-red-700 font-medium bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                  {registerError instanceof Error ? registerError.message : 'Registration failed'}
                </div>
              )}
              <Button type="submit" isLoading={isRegisterLoading} className="w-full h-11 text-[15px] font-semibold mt-1">
                Create account
              </Button>
            </form>
          </div>

          <p className="mt-6 text-sm text-center text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-teal-700 hover:text-teal-600 transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
