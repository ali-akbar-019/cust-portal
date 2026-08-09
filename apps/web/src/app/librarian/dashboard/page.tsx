'use client';

import { useAuth } from '@/lib/auth-context';
import { QuickLinkCard } from '@/components/ui/quick-link-card';

const LINKS = [
  { href: '/librarian/books', label: 'Book Catalog', desc: 'View all books and add new titles' },
  { href: '/librarian/clearances', label: 'Clearance Requests', desc: 'Approve or reject pending library clearances' },
];

export default function LibrarianDashboardPage() {
  const { profile } = useAuth();

  return (
    <main className="p-6 lg:p-10">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Library</p>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mb-8 text-sm text-slate-500">{profile?.email}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <QuickLinkCard key={l.href} {...l} />
        ))}
      </div>
    </main>
  );
}
