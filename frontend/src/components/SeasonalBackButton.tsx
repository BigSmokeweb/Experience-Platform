'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function SeasonalBackButton() {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/#seasonal-spots');
    }
  };

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-2 text-[#347F8C] hover:text-[#2A6772] text-sm font-mono transition-colors cursor-pointer"
      aria-label="Back to home"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Home
    </button>
  );
}

export default SeasonalBackButton;
