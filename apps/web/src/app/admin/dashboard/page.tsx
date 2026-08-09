'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { StatCard } from '@/components/ui/stat-card';
import { QuickLinkCard } from '@/components/ui/quick-link-card';
import { ChartCard } from '@/components/ui/chart-card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface StudentRow {
  department: { name: string; code: string };
}
interface TeacherRow {
  department: { name: string; code: string };
}
interface ComplaintRow {
  status: string;
}
interface RequestRow {
  status: string;
}
interface ClearanceRow {
  id: string;
}

const LINKS = [
  { href: '/admin/blocks', label: 'Blocks & Rooms', desc: 'View campus blocks, floors, and rooms' },
  { href: '/admin/timetable-generator', label: 'Timetable Generator', desc: "Auto-generate a department's timetable" },
  { href: '/admin/users', label: 'Manage Users', desc: 'Add new students and teachers' },
  { href: '/admin/notifications', label: 'Announcements', desc: 'Post announcements to everyone, a department, or a section' },
  { href: '/admin/invoices', label: 'Invoices', desc: 'Create fee invoices for students' },
  { href: '/admin/library', label: 'Library Clearances', desc: 'Approve or reject pending clearance requests' },
  { href: '/admin/complaints', label: 'Complaints', desc: 'Triage and resolve student complaints' },
  { href: '/admin/requests', label: 'Requests', desc: 'Transcripts, letters, course withdrawals, and more' },
];

const PIE_COLORS = ['var(--color-slate-900)', 'var(--color-red-600)', 'var(--color-yellow-500)', 'var(--color-green-600)', 'var(--color-blue-600)'];

export default function AdminDashboardPage() {
  const { accessToken, profile } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [clearances, setClearances] = useState<ClearanceRow[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<StudentRow[]>('/students', { token: accessToken }).then(setStudents).catch(() => {});
    apiFetch<TeacherRow[]>('/teachers', { token: accessToken }).then(setTeachers).catch(() => {});
    apiFetch<ComplaintRow[]>('/complaints', { token: accessToken }).then(setComplaints).catch(() => {});
    apiFetch<RequestRow[]>('/requests', { token: accessToken }).then(setRequests).catch(() => {});
    apiFetch<ClearanceRow[]>('/library/clearance/pending', { token: accessToken }).then(setClearances).catch(() => {});
  }, [accessToken]);

  const deptCounts = new Map<string, number>();
  students.forEach((s) => deptCounts.set(s.department.code, (deptCounts.get(s.department.code) ?? 0) + 1));
  const deptChartData = [...deptCounts.entries()].map(([code, count]) => ({ code, count }));

  const roleData = [
    { name: 'Students', value: students.length },
    { name: 'Teachers', value: teachers.length },
  ];

  const openComplaints = complaints.filter((c) => c.status === 'OPEN').length;
  const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <main className="p-6 lg:p-10">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Administration</p>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mb-8 text-sm text-slate-500">{profile?.email}</p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Students" value={String(students.length)} />
        <StatCard label="Total Teachers" value={String(teachers.length)} />
        <StatCard href="/admin/complaints" label="Open Complaints" value={String(openComplaints)} hint={openComplaints > 0 ? 'Needs attention' : undefined} />
        <StatCard href="/admin/requests" label="Pending Requests" value={String(pendingRequests)} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Students by Department">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-100)" />
              <XAxis dataKey="code" tick={{ fontSize: 11, fill: 'var(--color-slate-400)' }} axisLine={{ stroke: 'var(--color-slate-200)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-slate-400)' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-slate-200)' }} />
              <Bar dataKey="count" fill="var(--color-slate-900)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Faculty vs. Students">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {roleData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-slate-200)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {(clearances.length > 0 || openComplaints > 0 || pendingRequests > 0) && (
        <div className="mb-8 ledger-card border-l-4 border-l-red-600 p-4">
          <p className="mb-1 font-serif text-base font-semibold text-slate-900">Needs your attention</p>
          <ul className="space-y-1 text-sm text-slate-600">
            {openComplaints > 0 && <li>{openComplaints} open complaint(s)</li>}
            {pendingRequests > 0 && <li>{pendingRequests} pending request(s)</li>}
            {clearances.length > 0 && <li>{clearances.length} pending library clearance(s)</li>}
          </ul>
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
