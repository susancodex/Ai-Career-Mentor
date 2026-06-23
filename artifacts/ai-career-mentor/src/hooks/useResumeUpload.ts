import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadResumeToCloudinary, validateResumeFile } from '../api/cloudinary';
import { uploadResume, getResumes, getResume, getResumeAnalysis } from '../api/resumes';
import type { ResumeUploadInput } from '../lib/zodSchemas';

export function useResumeUpload() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cloudinaryError, setCloudinaryError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const resumesQuery = useQuery({
    queryKey: ['resumes'],
    queryFn: getResumes,
    staleTime: 30 * 1000,
  });

  const uploadMutation = useMutation({
    mutationFn: (data: ResumeUploadInput) => uploadResume(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      setUploadProgress(0);
      setCloudinaryError(null);
    },
  });

  async function uploadFile(file: File) {
    setCloudinaryError(null);
    setUploadProgress(0);

    const validation = validateResumeFile(file);
    if (!validation.valid) {
      setCloudinaryError(validation.error || 'Invalid file');
      return;
    }

    try {
      const cloudinaryData = await uploadResumeToCloudinary(file, setUploadProgress);
      await uploadMutation.mutateAsync({
        cloudinary_url: cloudinaryData.secure_url,
        cloudinary_public_id: cloudinaryData.public_id,
        original_filename: file.name,
      });
    } catch (error) {
      setCloudinaryError(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress(0);
    }
  }

  return {
    resumes: resumesQuery.data || [],
    isLoading: resumesQuery.isLoading,
    error: resumesQuery.error,
    uploadProgress,
    cloudinaryError,
    uploadError: uploadMutation.error,
    isUploading: uploadMutation.isPending || uploadProgress > 0,
    uploadFile,
    uploadMutation,
  };
}

export function useResumeDetail(resumeId: string | undefined) {
  return useQuery({
    queryKey: ['resume', resumeId],
    queryFn: () => getResume(resumeId!),
    enabled: !!resumeId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'uploaded' || data?.status === 'parsing') {
        return 3000;
      }
      return false;
    },
  });
}

export function useResumeAnalysis(resumeId: string | undefined) {
  return useQuery({
    queryKey: ['resume-analysis', resumeId],
    queryFn: () => getResumeAnalysis(resumeId!),
    enabled: !!resumeId,
  });
}
