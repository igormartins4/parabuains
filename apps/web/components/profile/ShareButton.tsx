'use client';

import { useState } from 'react';

interface ShareButtonProps {
  username: string;
  displayName: string;
}

export function ShareButton({ username, displayName }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const canonicalUrl = `https://parabuains.com/${username}`;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} no Parabuains`,
          text: `Parabéns para ${displayName}! 🎂`,
          url: canonicalUrl,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(canonicalUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        const textArea = document.createElement('textarea');
        textArea.value = canonicalUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium"
      aria-label="Compartilhar perfil"
    >
      {copied ? (
        <>
          <CheckIcon className="w-4 h-4 text-green-500" />
          <span className="text-green-600">Copiado!</span>
        </>
      ) : (
        <>
          <ShareIcon className="w-4 h-4" />
          <span>Compartilhar</span>
        </>
      )}
    </button>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon — parent button has aria-label
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon — parent button has aria-label
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
