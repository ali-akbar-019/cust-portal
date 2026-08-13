'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { ChartCard } from '@/components/ui/chart-card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AdminSectionHeading, AdminStat, AdminSurface } from '../_components/admin-ui';

interface StudentRow { department: { name: string; code: string }; }
interface TeacherRow { department: { name: string; code: string }; }
interface ComplaintRow { status: string; }
interface RequestRow { status: string; }
interface ClearanceRow { id: string; }

const LINKS = [
  { href: '/admin/blocks', label: 'Blocks & Rooms', desc: 'Review campus facilities and room capacity.' },
  { href: '/admin/timetable-generator', label: 'Timetable Generator', desc: 'Generate and inspect department schedules.' },
  { href: '/admin/users', label: 'Manage Users', desc: 'Create student and teacher accounts.' },
  { href: '/admin/notifications', label: 'Announcements', desc: 'Publish targeted university notices.' },
  { href: '/admin/invoices', label: 'Invoices', desc: 'Issue and review student fee invoices.' },
  { href: '/admin/library', label: 'Library Clearances', desc: 'Resolve pending clearance requests.' },
  { href: '/admin/complaints', label: 'Complaints', desc: 'Review, respond to, and resolve complaints.' },
  { href: '/admin/requests', label: 'Requests', desc: 'Process registrar and student requests.' },
];

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

  const deptChartData = useMemo(() => {
    const counts = new Map<string, number>();
    students.forEach((s) => counts.set(s.department.code, (counts.get(s.department.code) ?? 0) + 1));
    return [...counts.entries()].map(([code, count]) => ({ code, count }));
  }, [students]);

  const roleData = [
    { name: 'Students', value: students.length },
    { name: 'Teachers', value: teachers.length },
  ];

  const openComplaints = complaints.filter((c) => c.status === 'OPEN').length;
  const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;
  const attentionTotal = openComplaints + pendingRequests + clearances.length;

  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">
      <header className="mb-7 border-b border-slate-200/80 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Administration</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">{profile?.email ?? 'University administration overview'}</p>
          </div>
          <p className="text-xs text-slate-400">Live overview</p>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStat label="Students" value={students.length} detail="Accounts on record" />
        <AdminStat label="Teachers" value={teachers.length} detail="Faculty accounts" />
        <AdminStat href="/admin/complaints" label="Open complaints" value={openComplaints} detail={openComplaints ? 'Requires attention' : 'Nothing pending'} />
        <AdminStat href="/admin/requests" label="Pending requests" value={pendingRequests} detail="Waiting for review" />
      </div>

      {attentionTotal > 0 && (
        <AdminSurface className="mb-8 overflow-hidden">
          <div className="flex flex-col gap-4 border-l-4 border-slate-950 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">Attention required</p>
              <p className="mt-1 text-sm text-slate-500">
                {openComplaints > 0 && `${openComplaints} complaint${openComplaints === 1 ? '' : 's'}`}
                {openComplaints > 0 && pendingRequests > 0 ? ' · ' : ''}
                {pendingRequests > 0 && `${pendingRequests} request${pendingRequests === 1 ? '' : 's'}`}
                {(openComplaints > 0 || pendingRequests > 0) && clearances.length > 0 ? ' · ' : ''}
                {clearances.length > 0 && `${clearances.length} library clearance${clearances.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {openComplaints > 0 && <Link className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href="/admin/complaints">Review complaints</Link>}
              {pendingRequests > 0 && <Link className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href="/admin/requests">Review requests</Link>}
            </div>
          </div>
        </AdminSurface>
      )}

      <div className="mb-9 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Students by Department" subtitle="Current student distribution">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={deptChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-100)" />
              <XAxis dataKey="code" tick={{ fontSize: 11, fill: 'var(--color-slate-400)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-slate-400)' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip cursor={{ fill: 'var(--color-slate-50)' }} contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--color-slate-200)', boxShadow: '0 4px 16px rgba(15,23,42,.08)' }} />
              <Bar dataKey="count" fill="var(--color-slate-900)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="University Accounts" subtitle="Students compared with teaching staff">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={2}>
                <Cell fill="var(--color-slate-900)" />
                <Cell fill="var(--color-slate-300)" />
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--color-slate-200)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <AdminSectionHeading title="Administration" subtitle="Common tasks and operational areas" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {LINKS.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="mb-8 flex items-center justify-between">
              <span className="font-data text-[11px] text-slate-400">0{index + 1}</span>
              <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-700">→</span>
            </div>
            <p className="font-medium text-slate-950">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
