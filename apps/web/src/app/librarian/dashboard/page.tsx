'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
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
  { href: '/librarian/books', label: 'Book Catalog', desc: 'Add titles and review current collection availability.' },
  { href: '/librarian/clearances', label: 'Clearance Requests', desc: 'Approve or reject pending student library clearances.' },
];

const AVAIL_COLORS = ['#1F6F4A', '#A3182A'];

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export default function LibrarianDashboardPage() {
  const { accessToken, profile, isLoading: authLoading } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [clearances, setClearances] = useState<Clearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!accessToken) {
      setBooks([]);
      setClearances([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [bookResult, clearanceResult] = await Promise.all([
        apiFetch<Book[]>('/library/books', { token: accessToken }),
        apiFetch<Clearance[]>('/library/clearance/pending', { token: accessToken }),
      ]);
      setBooks(Array.isArray(bookResult) ? bookResult : []);
      setClearances(Array.isArray(clearanceResult) ? clearanceResult : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load the library dashboard.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!authLoading) void loadDashboard();
  }, [authLoading, loadDashboard]);

  const { totalCopies, available, checkedOut } = useMemo(() => {
    const total = books.reduce((sum, book) => sum + number(book.totalCopies), 0);
    const shelf = books.reduce((sum, book) => sum + Math.min(number(book.totalCopies), number(book.availableCopies)), 0);
    return { totalCopies: total, available: shelf, checkedOut: Math.max(0, total - shelf) };
  }, [books]);

  const availabilityData = useMemo(() => {
    const data = [] as { name: string; value: number }[];
    if (available > 0) data.push({ name: 'On the shelf', value: available });
    if (checkedOut > 0) data.push({ name: 'Out on loan', value: checkedOut });
    return data;
  }, [available, checkedOut]);

  const stockData = useMemo(
    () => [...books]
      .sort((a, b) => number(b.totalCopies) - number(a.totalCopies))
      .slice(0, 6)
      .map((book) => ({
        title: book.title.length > 18 ? `${book.title.slice(0, 18)}…` : book.title,
        copies: number(book.totalCopies),
        available: Math.min(number(book.totalCopies), number(book.availableCopies)),
      })),
    [books],
  );

  return (
    <main className="w-full min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
      <PageHeader
        eyebrow="Library"
        title="Dashboard"
        subtitle={`${books.length} titles · ${totalCopies} copies · holdings overview${profile?.email ? ` for ${profile.email}` : ''}`}
      />

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Catalog Titles" value={loading ? '—' : String(books.length)} />
        <StatCard label="Total Copies" value={loading ? '—' : String(totalCopies)} />
        <StatCard label="On the shelf" value={loading ? '—' : String(available)} hint={!loading && totalCopies > 0 ? `${Math.round((available / totalCopies) * 100)}% of collection available` : undefined} />
        <StatCard href="/librarian/clearances" label="Pending Clearances" value={loading ? '—' : String(clearances.length)} hint={!loading && clearances.length > 0 ? 'Needs your action' : undefined} />
      </div>

      {!loading && books.length > 0 && (
        <div className="mb-8 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Collection Availability" subtitle="Copies currently on the shelf vs. out on loan">
            <ResponsiveContainer width="100%" height={230}>
              {availabilityData.length > 0 ? (
                <PieChart>
                  <Pie data={availabilityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={3} strokeWidth={0}>
                    {availabilityData.map((entry, index) => <Cell key={entry.name} fill={AVAIL_COLORS[index % AVAIL_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Copies']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-slate-200)' }} />
                </PieChart>
              ) : <div className="flex h-full items-center justify-center text-sm text-slate-400">No copy data available.</div>}
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: AVAIL_COLORS[0] }} /> On shelf ({available})</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: AVAIL_COLORS[1] }} /> Out on loan ({checkedOut})</span>
            </div>
          </ChartCard>

          <ChartCard title="Stock by Title" subtitle="Top 6 titles — copies owned vs. currently available">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={stockData} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-100)" />
                <XAxis dataKey="title" tick={{ fontSize: 10, fill: 'var(--color-slate-400)' }} axisLine={{ stroke: 'var(--color-slate-200)' }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={45} />
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LINKS.map((link) => <QuickLinkCard key={link.href} {...link} />)}
      </div>
    </main>
  );
}
