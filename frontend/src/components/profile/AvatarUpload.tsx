import { useRef, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { apiClient } from "../../api/client";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB for avatars
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface Props {
  currentUrl: string;
  onSuccess: (url: string) => void;
}

export function AvatarUpload({ currentUrl, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, WebP, and GIF images are accepted.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Image must be under 2 MB.");
      return;
    }

    // Show local preview immediately
    setPreview(URL.createObjectURL(file));
    setLoading(true);

    try {
      // Upload to Cloudinary unsigned preset (avatars only)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_AVATAR_PRESET);
      formData.append("folder", "avatars");

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!cloudRes.ok) throw new Error("Cloudinary upload failed.");
      const { secure_url, public_id } = await cloudRes.json();

      // Save to our backend
      await apiClient.post("/me/avatar/", {
        cloudinary_url: secure_url,
        cloudinary_public_id: public_id,
      });

      onSuccess(secure_url);
    } catch (e: any) {
      setError(e.message ?? "Upload failed. Try again.");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Avatar display — 96px circle, touch-friendly */}
      <button
        onClick={() => inputRef.current?.click()}
        aria-label="Change profile picture"
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          overflow: "hidden",
          border: "2px solid #e2e8f0",
          cursor: "pointer",
          background: "#f1f5f9",
        }}
      >
        {(preview || currentUrl) ? (
          <img
            src={preview ?? currentUrl}
            alt="Your avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 36 }}>👤</span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {loading && <p>Uploading…</p>}
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
