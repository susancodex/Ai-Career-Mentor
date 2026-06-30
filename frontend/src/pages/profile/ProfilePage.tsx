import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  User, Camera, Lock, Bell, Trash2, Save, Eye, EyeOff,
  Loader2, CheckCircle, AlertCircle, Shield
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getProfile, updateProfile, uploadAvatar, changePassword, deleteAccount } from '../../api/auth';
import { uploadAvatarToCloudinary } from '../../api/cloudinary';
import { profileUpdateSchema, changePasswordSchema, type ProfileUpdateInput, type ChangePasswordInput } from '../../lib/zodSchemas';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import type { User as UserType } from '../../types';

type Tab = 'info' | 'security' | 'preferences';

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium border ${
        type === 'success'
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-red-50 text-red-800 border-red-200'
      }`}
    >
      {type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {message}
    </motion.div>
  );
}

function AvatarSection({ user }: { user: UserType }) {
  const queryClient = useQueryClient();
  const { setAuth, accessToken } = useAuthStore();
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = user.profile;
  const initials = (user.full_name || user.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hasCloudinary = !!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const { secure_url, public_id } = await uploadAvatarToCloudinary(file);
      const result = await uploadAvatar({ cloudinary_url: secure_url, cloudinary_public_id: public_id });
      const updatedUser = await getProfile();
      if (accessToken) setAuth(updatedUser, accessToken);
      queryClient.setQueryData(['profile'], updatedUser);
      void result;
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Avatar upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 mb-8 border-b border-slate-200">
      <div className="relative shrink-0">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={user.full_name}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center ring-4 ring-white shadow-lg">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
        )}
        {hasCloudinary && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors disabled:opacity-50"
            title="Change avatar"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <div className="text-center sm:text-left">
        <h2 className="text-xl font-bold text-slate-900">{user.full_name}</h2>
        <p className="text-slate-500 text-sm mt-0.5">{user.email}</p>
        {profile?.job_title && (
          <p className="text-teal-700 text-sm font-medium mt-1">{profile.job_title}{profile.company ? ` · ${profile.company}` : ''}</p>
        )}
        {!hasCloudinary && (
          <p className="text-xs text-amber-600 mt-2">Configure Cloudinary to enable avatar uploads.</p>
        )}
        {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
      </div>
    </div>
  );
}

function PersonalInfoTab({ user }: { user: UserType }) {
  const queryClient = useQueryClient();
  const { setAuth, accessToken } = useAuthStore();
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const profile = user.profile;
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
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

  return (
    <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
      {savedMsg && <Alert type="success" message={savedMsg} />}
      {errorMsg && <Alert type="error" message={errorMsg} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="First name"
          placeholder="Jane"
          error={errors.first_name?.message}
          {...register('first_name')}
        />
        <Input
          label="Last name"
          placeholder="Doe"
          error={errors.last_name?.message}
          {...register('last_name')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Job title"
          placeholder="Senior Software Engineer"
          error={errors.job_title?.message}
          {...register('job_title')}
        />
        <Input
          label="Company"
          placeholder="Acme Corp"
          error={errors.company?.message}
          {...register('company')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Location"
          placeholder="San Francisco, CA"
          error={errors.location?.message}
          {...register('location')}
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Years of experience</label>
          <input
            type="number"
            min={0}
            max={60}
            placeholder="5"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            {...register('years_experience', { valueAsNumber: true })}
          />
          {errors.years_experience && (
            <p className="mt-1 text-xs text-red-600">{errors.years_experience.message}</p>
          )}
        </div>
      </div>

      <Input
        label="Phone"
        type="tel"
        placeholder="+1 (555) 000-0000"
        error={errors.phone?.message}
        {...register('phone')}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
        <textarea
          rows={3}
          placeholder="A short bio about yourself..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
          {...register('bio')}
        />
        {errors.bio && <p className="mt-1 text-xs text-red-600">{errors.bio.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="LinkedIn URL"
          type="url"
          placeholder="https://linkedin.com/in/janedoe"
          error={errors.linkedin_url?.message}
          {...register('linkedin_url')}
        />
        <Input
          label="Website URL"
          type="url"
          placeholder="https://janedoe.dev"
          error={errors.website_url?.message}
          {...register('website_url')}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          isLoading={saveMutation.isPending}
          disabled={!isDirty && !saveMutation.isPending}
          className="min-w-[140px]"
        >
          <Save className="w-4 h-4 mr-2" />
          Save changes
        </Button>
      </div>
    </form>
  );
}

function SecurityTab() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
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
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">Change password</h3>
        <p className="text-sm text-slate-500 mb-5">Choose a strong password of at least 8 characters.</p>

        {savedMsg && <div className="mb-4"><Alert type="success" message={savedMsg} /></div>}
        {errorMsg && <div className="mb-4"><Alert type="error" message={errorMsg} /></div>}

        <form onSubmit={handleSubmit((data) => changeMutation.mutate(data))} className="space-y-4 max-w-md">
          <div className="relative">
            <Input
              label="Current password"
              type={showCurrent ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.current_password?.message}
              {...register('current_password')}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
            >
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
          <div className="pt-1">
            <Button type="submit" isLoading={changeMutation.isPending} className="min-w-[160px]">
              <Lock className="w-4 h-4 mr-2" />
              Update password
            </Button>
          </div>
        </form>
      </div>

      <DeleteAccountSection />
    </div>
  );
}

function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { logout: clearAuth } = useAuthStore();

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: () => {
      clearAuth();
      window.location.href = '/login';
    },
    onError: (err: Error) => {
      setError(err.message || 'Incorrect password.');
    },
  });

  return (
    <div className="pt-6 border-t border-slate-200">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-red-50 shrink-0">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Delete account</h3>
          <p className="text-sm text-slate-500 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              I want to delete my account
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-md space-y-3">
              <p className="text-sm font-medium text-red-800">
                Enter your password to confirm deletion:
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your current password"
                className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              {error && <p className="text-xs text-red-700">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={!password || deleteMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Delete my account
                </button>
                <button
                  onClick={() => { setOpen(false); setPassword(''); setError(''); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreferencesTab({ user }: { user: UserType }) {
  const queryClient = useQueryClient();
  const { setAuth, accessToken } = useAuthStore();
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const profile = user.profile;
  const [notifications, setNotifications] = useState(profile?.email_notifications_enabled ?? true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(profile?.theme_preference || 'system');

  const saveMutation = useMutation({
    mutationFn: () => updateProfile({ email_notifications_enabled: notifications, theme_preference: theme }),
    onSuccess: async (updated) => {
      if (accessToken) setAuth(updated, accessToken);
      queryClient.setQueryData(['profile'], updated);
      setSavedMsg('Preferences saved.');
      setErrorMsg('');
      setTimeout(() => setSavedMsg(''), 3000);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Failed to save preferences.');
    },
  });

  return (
    <div className="space-y-8">
      {savedMsg && <Alert type="success" message={savedMsg} />}
      {errorMsg && <Alert type="error" message={errorMsg} />}

      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">Theme</h3>
        <p className="text-sm text-slate-500 mb-4">Choose how the app looks for you.</p>
        <div className="flex gap-3">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${
                theme === t
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">Email notifications</h3>
        <p className="text-sm text-slate-500 mb-4">Receive updates about your career progress and new job matches.</p>
        <label className="flex items-center gap-3 cursor-pointer w-fit">
          <div className="relative">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors ${notifications ? 'bg-teal-600' : 'bg-slate-300'}`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-slate-700">
            {notifications ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      <div className="pt-2">
        <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending} className="min-w-[140px]">
          <Save className="w-4 h-4 mr-2" />
          Save preferences
        </Button>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
  });

  const user = profileQuery.data;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'info', label: 'Personal Info', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Bell },
  ];

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12 text-slate-500">
        Failed to load profile. Please refresh.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Profile</h1>
        <p className="text-slate-500 mt-1.5">Manage your account, security, and preferences.</p>
      </div>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <AvatarSection user={user} />

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'info' && <PersonalInfoTab user={user} />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'preferences' && <PreferencesTab user={user} />}
        </CardContent>
      </Card>
    </motion.div>
  );
}
