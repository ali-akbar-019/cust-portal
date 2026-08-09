'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { QuickLinkCard } from '@/components/ui/quick-link-card';

interface Book {
  id: string;
  availableCopies: number;
  totalCopies: number;
}
interface Clearance {
  id: string;
}

const LINKS = [
  { href: '/librarian/books', label: 'Book Catalog', desc: 'Add new titles and keep the catalog availability accurate' },
  { href: '/librarian/clearances', label: 'Clearance Requests', desc: 'Approve or reject pending student library clearances' },
];

export default function LibrarianDashboardPage() {
  const { accessToken, profile } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [clearances, setClearances] = useState<Clearance[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<Book[]>('/library/books', { token: accessToken }).then(setBooks).catch(() => {});
    apiFetch<Clearance[]>('/library/clearance/pending', { token: accessToken }).then(setClearances).catch(() => {});
  }, [accessToken]);

  const checkedOut = books.reduce((sum, b) => sum + (b.totalCopies - b.availableCopies), 0);

  return (
    <main className="p-6 lg:p-10">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Library</p>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mb-8 text-sm text-slate-500">{profile?.email}</p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Catalog Titles" value={String(books.length)} />
        <StatCard label="Total Copies" value={String(books.reduce((s, b) => s + b.totalCopies, 0))} />
        <StatCard label="Out on loan" value={String(checkedOut)} hint={checkedOut > 0 ? 'Copies currently held by reservations' : undefined} />
        <StatCard href="/librarian/clearances" label="Pending Clearances" value={String(clearances.length)} hint={clearances.length > 0 ? 'Needs your action' : undefined} />
      </div>

      <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">Quick Actions</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <QuickLinkCard key={l.href} {...l} />
        ))}
      </div>
    </main>
  );
}