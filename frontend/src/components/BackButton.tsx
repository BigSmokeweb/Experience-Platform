'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
}

export function BackButton({
  fallbackHref = '/#curated-experiences',
  label = 'Go Back',
  className = 'inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#2C2C2C] hover:text-[#347F8C] bg-white border border-[#D4CFC0] hover:border-[#347F8C]/60 px-4 py-2.5 rounded-xl transition-all duration-200 shadow-xs hover:shadow-sm font-bold active:scale-95 cursor-pointer',
  iconClassName = 'w-4 h-4 text-[#347F8C]',
  children,
}: BackButtonProps) {
  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = fallbackHref;
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={className}
      aria-label={label}
    >
      <ArrowLeft className={iconClassName} />
      {children || <span>{label}</span>}
    </button>
  );
}

export default BackButton;
