'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const LINKS = [
  { href: '/librarian/books', label: 'Book Catalog', desc: 'View all books and add new titles' },
  { href: '/librarian/clearances', label: 'Clearance Requests', desc: 'Approve or reject pending library clearances' },
];

export default function LibrarianDashboardPage() {
  const { profile } = useAuth();

  return (
    <main className="p-8">
      <h1 className="mb-1 text-xl font-semibold">Librarian Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">{profile?.email}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg border border-slate-200 p-4 transition hover:border-slate-400 hover:shadow-sm"
          >
            <p className="mb-1 font-medium">{l.label}</p>
            <p className="text-sm text-slate-500">{l.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
