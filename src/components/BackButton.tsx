'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BackButton({ fallbackUrl = '/' }: { fallbackUrl?: string }) {
  const router = useRouter();

  return (
    <button 
      onClick={() => {
        if (window.history.length > 2) {
          router.back();
        } else {
          router.push(fallbackUrl);
        }
      }} 
      className="btn btn-secondary"
      style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
    >
      <ArrowLeft size={16} /> Назад
    </button>
  );
}
