'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { AvatarUploadError, uploadAvatar } from '@/lib/avatar';

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  displayName: string;
}

export function AvatarUpload({ currentAvatarUrl, displayName }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setIsUploading(true);

    try {
      const result = await uploadAvatar(file);
      setAvatarUrl(`${result.avatarUrl}?t=${Date.now()}`);
    } catch (err) {
      if (err instanceof AvatarUploadError) {
        setError(err.message);
      } else {
        setError('Erro inesperado ao enviar foto. Tente novamente.');
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop target for drag-and-drop avatar upload; not keyboard-interactive */}
      <div
        className={`relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 transition-colors ${
          isDragging ? 'border-pink-400 border-dashed' : 'border-transparent'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`Foto de ${displayName}`}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-3xl font-bold text-gray-400">
            {displayName[0]?.toUpperCase()}
          </span>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Selecionar foto de perfil"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="text-sm text-pink-600 hover:text-pink-700 font-medium disabled:opacity-50"
      >
        {isUploading ? 'Enviando...' : 'Alterar foto'}
      </button>

      {error && (
        <p className="text-sm text-red-600 text-center max-w-xs" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs text-gray-400 text-center">
        JPEG, PNG ou WebP · Máximo 5MB · Redimensionado para 400×400
      </p>
    </div>
  );
}
