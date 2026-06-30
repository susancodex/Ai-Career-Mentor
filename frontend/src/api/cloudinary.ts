const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const AVATAR_PRESET = import.meta.env.VITE_CLOUDINARY_AVATAR_PRESET;

const MAX_RESUME_SIZE = 5 * 1024 * 1024;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.docx'];
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateResumeFile(file: File): { valid: boolean; error?: string } {
  if (
    !ALLOWED_RESUME_TYPES.includes(file.type) &&
    !ALLOWED_RESUME_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  ) {
    return { valid: false, error: 'Only PDF and DOCX files are allowed' };
  }
  if (file.size > MAX_RESUME_SIZE) {
    return { valid: false, error: 'File size must be 5MB or less' };
  }
  return { valid: true };
}

export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPG, PNG, WebP, or GIF images are allowed' };
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return { valid: false, error: 'Avatar image must be 2MB or less' };
  }
  return { valid: true };
}

export async function uploadResumeToCloudinary(
  file: File,
  onProgress: (pct: number) => void
): Promise<{ secure_url: string; public_id: string }> {
  const validation = validateResumeFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('resource_type', 'raw');

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({ secure_url: data.secure_url, public_id: data.public_id });
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed due to network error'));
    xhr.send(formData);
  });
}

export async function uploadAvatarToCloudinary(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ secure_url: string; public_id: string }> {
  const validation = validateAvatarFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const preset = AVATAR_PRESET || UPLOAD_PRESET;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({ secure_url: data.secure_url, public_id: data.public_id });
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed due to network error'));
    xhr.send(formData);
  });
}
