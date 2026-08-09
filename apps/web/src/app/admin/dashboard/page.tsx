'use client';

import { useAuth } from '@/lib/auth-context';
import { QuickLinkCard } from '@/components/ui/quick-link-card';

const LINKS = [
  { href: '/admin/blocks', label: 'Blocks & Rooms', desc: 'View campus blocks, floors, and rooms' },
  { href: '/admin/timetable-generator', label: 'Timetable Generator', desc: "Auto-generate a department's timetable" },
  { href: '/admin/notifications', label: 'Announcements', desc: 'Post announcements to everyone, a department, or a section' },
  { href: '/admin/invoices', label: 'Invoices', desc: 'Create fee invoices for students' },
  { href: '/admin/library', label: 'Library Clearances', desc: 'Approve or reject pending clearance requests' },
  { href: '/admin/complaints', label: 'Complaints', desc: 'Triage and resolve student complaints' },
  { href: '/admin/requests', label: 'Requests', desc: 'Transcripts, letters, course withdrawals, and more' },
];

export default function AdminDashboardPage() {
  const { profile } = useAuth();

  return (
    <main className="p-6 lg:p-10">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Administration</p>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mb-8 text-sm text-slate-500">{profile?.email}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((l) => (
          <QuickLinkCard key={l.href} {...l} />
        ))}
      </div>
    </main>
  );
}
