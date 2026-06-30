import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name is required'),
});

export const profileUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  phone: z.string().max(20, 'Phone too long').optional(),
  location: z.string().max(100, 'Location too long').optional(),
  linkedin_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  website_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  job_title: z.string().max(100, 'Job title too long').optional(),
  company: z.string().max(100, 'Company name too long').optional(),
  years_experience: z.number().min(0).max(60).optional().nullable(),
  preferred_roles: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  email_notifications_enabled: z.boolean().optional(),
  theme_preference: z.enum(['light', 'dark', 'system']).optional(),
  current_role: z.string().optional(),
  target_roles: z.array(z.string()).optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string().min(8, 'Confirm password is required'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export const resumeUploadSchema = z.object({
  cloudinary_url: z.string().url(),
  cloudinary_public_id: z.string(),
  original_filename: z.string(),
});

export const chatMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message too long'),
});

export const interviewAnswerSchema = z.object({
  user_answer: z.string().min(1, 'Answer cannot be empty').max(10000, 'Answer too long'),
});

export const jobMatchUpdateSchema = z.object({
  status: z.enum(['saved', 'applied', 'dismissed']),
});

export const learningResourceUpdateSchema = z.object({
  completed: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResumeUploadInput = z.infer<typeof resumeUploadSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type InterviewAnswerInput = z.infer<typeof interviewAnswerSchema>;
