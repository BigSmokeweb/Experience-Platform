'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, CheckCircle2 } from 'lucide-react';
import { createBlankEntry, saveEntry } from '@/lib/journal-store';

interface AddToJournalButtonProps {
  experienceId: string;
  experienceTitle: string;
  city?: string;
  /** Visual variant */
  variant?: 'pill' | 'card';
}

/**
 * Drop this button anywhere on an experience detail page.
 * It creates a pre-filled blank journal entry for the experience
 * and navigates to the editor.
 */
export function AddToJournalButton({
  experienceId,
  experienceTitle,
  city = '',
  variant = 'pill',
}: AddToJournalButtonProps) {
  const router = useRouter();
  const [clicked, setClicked] = useState(false);

  function handleClick() {
    setClicked(true);
    const entry = createBlankEntry({
      experienceId,
      experienceTitle,
      city,
      title: `My visit to ${experienceTitle}`,
    });
    saveEntry(entry);
    setTimeout(() => {
      router.push(`/journal/${entry.id}`);
    }, 350);
  }

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#EBE3D5] hover:bg-[#E0D8C8] border border-[#D4CFC0] hover:border-[#C4A265] text-[#2C2C2C] transition-all duration-200 active:scale-[0.98] cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 border border-[#D4CFC0] group-hover:border-[#C4A265] transition-colors">
          {clicked ? (
            <CheckCircle2 className="w-4.5 h-4.5 text-[#347F8C]" />
          ) : (
            <BookOpen className="w-4.5 h-4.5 text-[#347F8C]" />
          )}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium leading-tight">
            {clicked ? 'Opening journal…' : 'Journal this experience'}
          </p>
          <p className="text-[10px] font-mono text-[#5C6460] mt-0.5">
            Write notes, upload photos, rate your visit
          </p>
        </div>
        {!clicked && <Plus className="w-4 h-4 text-[#5C6460] ml-auto shrink-0" />}
      </button>
    );
  }

  // Default: pill
  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D4CFC0] bg-white hover:bg-[#F5F1E6] hover:border-[#C4A265] text-[#2C2C2C] text-xs font-medium transition-all duration-200 active:scale-95 cursor-pointer"
    >
      {clicked ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-[#347F8C]" />
      ) : (
        <BookOpen className="w-3.5 h-3.5 text-[#347F8C]" />
      )}
      {clicked ? 'Opening…' : 'Journal this'}
    </button>
  );
}
