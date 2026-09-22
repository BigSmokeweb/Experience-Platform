'use client';

import { useParams } from 'next/navigation';
import { JournalEditor } from '@/components/JournalEditor';

export default function JournalEntryPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';
  return <JournalEditor entryId={id} />;
}
