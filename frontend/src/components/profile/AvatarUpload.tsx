import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { uploadAvatar, getProfile } from '../../api/auth';
import { uploadAvatarToCloudinary } from '../../api/cloudinary';

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface Props {
  currentUrl?: string;
  fullName?: string;
  onSuccess: (url: string) => void;
}

export function AvatarUpload({ currentUrl, fullName, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { setAuth, accessToken } = useAuthStore();

  const hasCloudinary = !!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const initials = (fullName || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleFile = async (file: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, WebP, and GIF images are accepted.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('Image must be under 2 MB.');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setLoading(true);

    try {
      const { secure_url, public_id } = await uploadAvatarToCloudinary(file);
      await uploadAvatar({ cloudinary_url: secure_url, cloudinary_public_id: public_id });
      const updatedUser = await getProfile();
      if (accessToken) setAuth(updatedUser, accessToken);
      queryClient.setQueryData(['profile'], updatedUser);
      onSuccess(secure_url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again.');
      setPreview(null);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const displayUrl = preview || currentUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => hasCloudinary && inputRef.current?.click()}
          aria-label="Change profile picture"
          disabled={loading || !hasCloudinary}
          className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-default"
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={fullName || 'Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-white">{initials}</span>
          )}
        </button>

        {hasCloudinary && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            aria-label="Upload new photo"
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors disabled:opacity-50"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Camera className="w-4 h-4" />
            }
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {!hasCloudinary && (
        <p className="text-xs text-amber-600 text-center">
          Configure VITE_CLOUDINARY_CLOUD_NAME to enable avatar uploads.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600 text-center">{error}</p>
      )}
      {loading && (
        <p className="text-xs text-slate-500">Uploading…</p>
      )}
    </div>
  );
}
