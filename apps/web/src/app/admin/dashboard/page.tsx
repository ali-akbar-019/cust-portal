'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const LINKS = [
  { href: '/admin/blocks', label: 'Blocks & Rooms', desc: 'View campus blocks, floors, and rooms' },
  { href: '/admin/timetable-generator', label: 'Timetable Generator', desc: 'Auto-generate a department\'s timetable' },
  { href: '/admin/notifications', label: 'Announcements', desc: 'Post announcements to everyone, a department, or a section' },
  { href: '/admin/invoices', label: 'Invoices', desc: 'Create fee invoices for students' },
  { href: '/admin/library', label: 'Library Clearances', desc: 'Approve or reject pending clearance requests' },
  { href: '/admin/complaints', label: 'Complaints', desc: 'Triage and resolve student complaints' },
  { href: '/admin/requests', label: 'Requests', desc: 'Transcripts, letters, course withdrawals, and more' },
];

export default function AdminDashboardPage() {
  const { profile } = useAuth();

  return (
    <main className="p-8">
      <h1 className="mb-1 text-xl font-semibold">Admin Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">{profile?.email}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
