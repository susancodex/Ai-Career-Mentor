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
  current_role: z.string().optional(),
  years_experience: z.number().min(0).optional(),
  target_roles: z.array(z.string()).optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
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
export type ResumeUploadInput = z.infer<typeof resumeUploadSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type InterviewAnswerInput = z.infer<typeof interviewAnswerSchema>;
