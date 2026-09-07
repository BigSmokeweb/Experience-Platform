'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileRootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const role = localStorage.getItem('userRole');

    if (!token) {
      router.replace('/auth/login?redirect=/profile');
      return;
    }

    if (role === 'HOST' || role === 'PROVIDER') {
      router.replace('/profile/provider');
    } else {
      router.replace('/profile/traveler');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
        <p className="text-xs font-medium text-neutral-500">Redirecting to your profile space...</p>
      </div>
    </div>
  );
}
