'use client';

import { useAuth } from '@/lib/auth-context';
import { QuickLinkCard } from '@/components/ui/quick-link-card';

const LINKS = [
  { href: '/teacher/timetable', label: 'My Timetable', desc: 'View your teaching schedule' },
  { href: '/teacher/attendance', label: 'Mark Attendance', desc: 'Bulk-mark attendance for a section' },
  { href: '/teacher/assignments', label: 'Assignments', desc: 'Create assignments and grade submissions' },
  { href: '/teacher/grades', label: 'Enter Grades', desc: 'Enter component-wise marks for students' },
  { href: '/teacher/feedback', label: 'Section Feedback', desc: 'View anonymized feedback for your sections' },
];

export default function TeacherDashboardPage() {
  const { profile } = useAuth();

  return (
    <main className="p-6 lg:p-10">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Faculty</p>
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
