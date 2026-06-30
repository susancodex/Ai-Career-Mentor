import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { getProfile } from '../../api/auth';
import { AvatarUpload } from '../../components/profile/AvatarUpload';
import { Card, CardContent } from '../../components/ui/Card';

export function ProfileAvatarPage() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
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
        <h2 className="text-base font-semibold text-slate-900 mb-1">Profile Photo</h2>
        <p className="text-sm text-slate-500 mb-8">
          Upload a photo to personalise your profile. JPEG, PNG, WebP, or GIF · max 2 MB.
        </p>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
          <AvatarUpload
            currentUrl={user?.profile?.avatar_url}
            fullName={user?.full_name}
            onSuccess={() => refetch()}
          />

          <div className="flex-1 text-sm text-slate-500 space-y-1.5">
            <p className="font-semibold text-slate-700">Tips for a great photo:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Use a clear, recent headshot</li>
              <li>Square crop works best (1:1 ratio)</li>
              <li>Well-lit, neutral background</li>
              <li>At least 400 × 400 px recommended</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
