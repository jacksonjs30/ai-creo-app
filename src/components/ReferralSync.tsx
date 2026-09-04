'use client';

import { useEffect } from 'react';

export function ReferralSync() {
  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|; )ref_token=([^;]*)/);
      if (match && match[1]) {
        localStorage.setItem('ref_token', match[1]);
      }
    } catch (e) {
      console.error('Failed to sync ref_token', e);
    }
  }, []);

  return null;
}
