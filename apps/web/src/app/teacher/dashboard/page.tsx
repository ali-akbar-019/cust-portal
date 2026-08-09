'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { StatCard } from '@/components/ui/stat-card';
import { QuickLinkCard } from '@/components/ui/quick-link-card';
import { ChartCard } from '@/components/ui/chart-card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MySection {
  id: string;
  course: { title: string; code: string };
  enrolledCount: number;
  capacity: number;
}

const LINKS = [
  { href: '/teacher/timetable', label: 'My Timetable', desc: 'View your teaching schedule' },
  { href: '/teacher/attendance', label: 'Mark Attendance', desc: 'Bulk-mark attendance for a section' },
  { href: '/teacher/assignments', label: 'Assignments', desc: 'Create assignments and grade submissions' },
  { href: '/teacher/grades', label: 'Enter Grades', desc: 'Enter component-wise marks for students' },
  { href: '/teacher/feedback', label: 'Section Feedback', desc: 'View anonymized feedback for your sections' },
];

export default function TeacherDashboardPage() {
  const { accessToken, profile } = useAuth();
  const [sections, setSections] = useState<MySection[]>([]);

  useEffect(() => {
    if (!accessToken || !profile?.teacherId) return;
    apiFetch<MySection[]>(`/teachers/${profile.teacherId}/sections`, { token: accessToken }).then(setSections).catch(() => {});
  }, [accessToken, profile]);

  const totalStudents = sections.reduce((sum, s) => sum + s.enrolledCount, 0);
  const chartData = sections.map((s) => ({ code: s.course.code, enrolled: s.enrolledCount, capacity: s.capacity }));

  return (
    <main className="p-6 lg:p-10">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Faculty</p>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mb-8 text-sm text-slate-500">{profile?.email}</p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Sections Teaching" value={String(sections.length)} />
        <StatCard label="Total Students" value={String(totalStudents)} />
        <StatCard
          label="Avg. Section Size"
          value={sections.length > 0 ? Math.round(totalStudents / sections.length).toString() : '—'}
        />
      </div>

      {sections.length > 0 && (
        <div className="mb-8">
          <ChartCard title="Enrollment by Section" subtitle="Enrolled students vs. capacity">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-100)" />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: 'var(--color-slate-400)' }} axisLine={{ stroke: 'var(--color-slate-200)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-slate-400)' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-slate-200)' }} />
                <Bar dataKey="capacity" fill="var(--color-slate-200)" radius={[4, 4, 0, 0]} name="Capacity" />
                <Bar dataKey="enrolled" fill="var(--color-slate-900)" radius={[4, 4, 0, 0]} name="Enrolled" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">Quick Actions</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((l) => (
          <QuickLinkCard key={l.href} {...l} />
        ))}
      </div>
    </main>
  );
}
