'use client';

import React from 'react';
import { useOperatingStatus } from '@/lib/operating-hours';
import { Clock } from 'lucide-react';

interface OperatingStatusBadgeProps {
  openingTime?: string;
  closingTime?: string;
  operatingHours?: string;
  closedDays?: string;
  showHoursText?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function OperatingStatusBadge({
  openingTime,
  closingTime,
  operatingHours,
  closedDays,
  showHoursText = false,
  className = '',
  size = 'md',
}: OperatingStatusBadgeProps) {
  const { isOpen, label, hoursText, isMounted } = useOperatingStatus({
    openingTime,
    closingTime,
    operatingHours,
    closedDays,
  });

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-[11px] px-2.5 py-0.5',
    lg: 'text-xs px-3 py-1',
  };

  const dotClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`inline-flex items-center gap-1.5 rounded-full font-mono font-bold tracking-wider transition-all duration-300 border ${sizeClasses[size]} ${
          isOpen
            ? 'bg-emerald-50/90 border-emerald-300/80 text-emerald-700 shadow-[0_1px_4px_rgba(16,185,129,0.12)]'
            : 'bg-rose-50/90 border-rose-300/80 text-rose-700 shadow-[0_1px_4px_rgba(244,63,94,0.12)]'
        }`}
        title={hoursText}
      >
        <span
          className={`${dotClasses[size]} rounded-full shrink-0 ${
            isOpen
              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse'
              : 'bg-rose-500'
          }`}
        />
        <span>{label}</span>
      </div>

      {showHoursText && hoursText && (
        <span className="text-[11px] font-mono text-[#555E5A] flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#A69B80]" />
          <span>{hoursText}</span>
          {closedDays && closedDays.toLowerCase() !== 'none' && (
            <span className="text-[10px] text-[#888] font-light">
              (Closed {closedDays})
            </span>
          )}
        </span>
      )}
    </div>
  );
}
