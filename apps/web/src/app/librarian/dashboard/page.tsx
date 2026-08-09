'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { QuickLinkCard } from '@/components/ui/quick-link-card';
import { ChartCard } from '@/components/ui/chart-card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface Book {
  id: string;
  title: string;
  author: string;
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

const AVAIL_COLORS = ['#1F6F4A', '#A3182A', '#C79A47'];

export default function LibrarianDashboardPage() {
  const { accessToken, profile } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [clearances, setClearances] = useState<Clearance[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<Book[]>('/library/books', { token: accessToken }).then(setBooks).catch(() => {});
    apiFetch<Clearance[]>('/library/clearance/pending', { token: accessToken }).then(setClearances).catch(() => {});
  }, [accessToken]);

  const totalCopies = books.reduce((s, b) => s + b.totalCopies, 0);
  const available = books.reduce((s, b) => s + b.availableCopies, 0);
  const checkedOut = totalCopies - available;

  // Availability split (pie) + per-title stock bars; both computed client-side.
  const availabilityData = [
    { name: 'On the shelf', value: available },
    { name: 'Out on loan', value: checkedOut },
  ];
  const stockData = [...books]
    .sort((a, b) => b.totalCopies - a.totalCopies)
    .slice(0, 6)
    .map((b) => ({ title: b.title.length > 22 ? `${b.title.slice(0, 22)}…` : b.title, copies: b.totalCopies, available: b.availableCopies }));

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Library"
        title="Dashboard"
        subtitle={`${books.length} titles · ${totalCopies} copies · holdings overview for ${profile?.email}`}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Catalog Titles" value={String(books.length)} />
        <StatCard label="Total Copies" value={String(totalCopies)} />
        <StatCard label="On the shelf" value={String(available)} hint={totalCopies > 0 ? `${Math.round((available / totalCopies) * 100)}% of collection available` : undefined} />
        <StatCard href="/librarian/clearances" label="Pending Clearances" value={String(clearances.length)} hint={clearances.length > 0 ? 'Needs your action' : undefined} />
      </div>

      {books.length > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Collection Availability" subtitle="Copies currently on the shelf vs. out on loan">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={availabilityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={3} strokeWidth={0}>
                  {availabilityData.map((e, i) => (
                    <Cell key={e.name} fill={AVAIL_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-slate-200)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: AVAIL_COLORS[0] }} /> On shelf ({available})</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: AVAIL_COLORS[1] }} /> Out on loan ({checkedOut})</span>
            </div>
          </ChartCard>

          <ChartCard title="Stock by Title" subtitle="Top 6 titles — copies owned vs. currently available">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={stockData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-100)" />
                <XAxis dataKey="title" tick={{ fontSize: 10, fill: 'var(--color-slate-400)' }} axisLine={{ stroke: 'var(--color-slate-200)' }} tickLine={false} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-slate-400)' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-slate-200)' }} />
                <Bar dataKey="copies" fill="var(--color-slate-200)" radius={[4, 4, 0, 0]} name="Copies owned" />
                <Bar dataKey="available" fill="var(--color-slate-900)" radius={[4, 4, 0, 0]} name="Available" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">Quick Actions</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <QuickLinkCard key={l.href} {...l} />
        ))}
      </div>
    </main>
  );
}