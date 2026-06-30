import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { getProfile, updateProfile } from '../../api/auth';
import { profileUpdateSchema, type ProfileUpdateInput } from '../../lib/zodSchemas';
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

export function ProfileSettingsPage() {
  const queryClient = useQueryClient();
  const { setAuth, accessToken } = useAuthStore();
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
  });

  const profile = user?.profile;

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    values: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      bio: profile?.bio || '',
      phone: profile?.phone || '',
      location: profile?.location || '',
      linkedin_url: profile?.linkedin_url || '',
      website_url: profile?.website_url || '',
      job_title: profile?.job_title || '',
      company: profile?.company || '',
      years_experience: profile?.years_experience ?? undefined,
    },
  });

  const saveMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (updated) => {
      if (accessToken) setAuth(updated, accessToken);
      queryClient.setQueryData(['profile'], updated);
      setSavedMsg('Profile saved successfully.');
      setErrorMsg('');
      setTimeout(() => setSavedMsg(''), 3000);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Failed to save profile.');
      setSavedMsg('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">General Info</h2>
        <p className="text-sm text-slate-500 mb-6">Update your name, bio, and contact details.</p>

        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-5">
          {savedMsg && <Alert type="success" message={savedMsg} />}
          {errorMsg && <Alert type="error" message={errorMsg} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First name" placeholder="Jane" error={errors.first_name?.message} {...register('first_name')} />
            <Input label="Last name" placeholder="Doe" error={errors.last_name?.message} {...register('last_name')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Job title" placeholder="Senior Software Engineer" error={errors.job_title?.message} {...register('job_title')} />
            <Input label="Company" placeholder="Acme Corp" error={errors.company?.message} {...register('company')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Location" placeholder="San Francisco, CA" error={errors.location?.message} {...register('location')} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Years of experience</label>
              <input
                type="number" min={0} max={60} placeholder="5"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                {...register('years_experience', { valueAsNumber: true })}
              />
              {errors.years_experience && <p className="mt-1 text-xs text-red-600">{errors.years_experience.message}</p>}
            </div>
          </div>

          <Input label="Phone" type="tel" placeholder="+1 (555) 000-0000" error={errors.phone?.message} {...register('phone')} />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
            <textarea
              rows={3} placeholder="A short bio about yourself…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
              {...register('bio')}
            />
            {errors.bio && <p className="mt-1 text-xs text-red-600">{errors.bio.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="LinkedIn URL" type="url" placeholder="https://linkedin.com/in/you" error={errors.linkedin_url?.message} {...register('linkedin_url')} />
            <Input label="Website URL" type="url" placeholder="https://yoursite.dev" error={errors.website_url?.message} {...register('website_url')} />
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" isLoading={saveMutation.isPending} disabled={!isDirty && !saveMutation.isPending} className="min-w-[140px]">
              <Save className="w-4 h-4 mr-2" />
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
