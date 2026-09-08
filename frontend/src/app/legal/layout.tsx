import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Journi',
    default: 'Legal | Journi',
  },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
