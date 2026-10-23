'use client';

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import type { Attachment } from '@/app/types';

const BUCKET = 'incident-attachments';
const MAX_BYTES = 1024 * 1024; // 1 MB
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface UploadResult {
  success: boolean;
  attachment?: Attachment;
  error?: string;
}

export interface AvatarUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function validateAndProcessImage(file: File): Promise<UploadResult> {
  if (!ALLOWED_MIME.includes(file.type.toLowerCase())) {
    return {
      success: false,
      error: 'Only JPG, PNG, or WEBP images are accepted.',
    };
  }

  let blob: Blob = file;
  let mime = file.type;
  let size = file.size;

  if (file.size > MAX_BYTES) {
    try {
      const compressed = await compressToJpeg(file, 0.7);
      if (compressed.size > MAX_BYTES) {
        return {
          success: false,
          error: 'Image is too large. Please use a smaller image (<1MB).',
        };
      }
      blob = compressed;
      mime = 'image/jpeg';
      size = compressed.size;
    } catch {
      return {
        success: false,
        error: 'Could not compress the image. Please try a different photo.',
      };
    }
  }

  let supabase;
  try {
    supabase = getSupabaseBrowserClient();
  } catch {
    return {
      success: false,
      error: 'Storage is not configured. Cannot attach images.',
    };
  }

  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const path = `unassigned/${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: mime, upsert: false });

  if (uploadError) {
    return {
      success: false,
      error: uploadError.message || 'Upload failed. Please try again.',
    };
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    success: true,
    attachment: {
      id,
      name: file.name,
      url: publicUrlData.publicUrl,
      sizeBytes: size,
      mimeType: mime,
    },
  };
}

/** Upload a profile avatar (compressed, public URL). */
export async function uploadAvatar(file: File, userId: string): Promise<AvatarUploadResult> {
  if (!ALLOWED_MIME.includes(file.type.toLowerCase())) {
    return { success: false, error: 'Only JPG, PNG, or WEBP images are accepted.' };
  }

  let blob: Blob = file;
  let mime = file.type;

  try {
    // Always compress/resize for consistent avatar size
    blob = await compressToJpeg(file, 0.82, 512);
    mime = 'image/jpeg';
    if (blob.size > MAX_BYTES) {
      blob = await compressToJpeg(file, 0.6, 384);
    }
    if (blob.size > MAX_BYTES) {
      return { success: false, error: 'Image is still too large after compression.' };
    }
  } catch {
    return { success: false, error: 'Could not process the image. Try another photo.' };
  }

  let supabase;
  try {
    supabase = getSupabaseBrowserClient();
  } catch {
    return { success: false, error: 'Storage is not configured.' };
  }

  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'user';
  const path = `avatars/${safeId}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) {
    return {
      success: false,
      error: uploadError.message || 'Avatar upload failed. Check storage permissions.',
    };
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { success: true, url: publicUrlData.publicUrl };
}

function compressToJpeg(file: File, quality: number, maxDim = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas unavailable'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}
