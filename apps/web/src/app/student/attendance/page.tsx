'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Ribbon } from '@/components/ui/ribbon';

interface AttendanceSummary {
  total: number;
  present: number;
  percentage: number;
  isLow: boolean;
  threshold: number;
  records: { date: string; status: 'PRESENT' | 'ABSENT' }[];
}

export default function StudentAttendancePage() {
  const { accessToken, profile, isLoading: authLoading } = useAuth();
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !accessToken) return;
    if (!profile?.studentId) {
      setError('Could not resolve your student profile. Try logging out and back in.');
      return;
    }
    apiFetch<AttendanceSummary>(`/attendance/student/${profile.studentId}`, { token: accessToken })
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load attendance'));
  }, [accessToken, profile, authLoading]);

  if (error) return <main className="p-6 lg:p-10"><PageHeader title="My Attendance" subtitle="Your presence record for the current semester" /> <p className="text-sm text-red-600">{error}</p></main>;
  if (!summary) return <main className="p-6 lg:p-10"><PageHeader title="My Attendance" subtitle="Your presence record for the current semester" /><p className="text-sm text-slate-500">Loading attendance...</p></main>;

  const absent = summary.total - summary.present;
  const recent = [...summary.records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  const streak = [...summary.records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Personal Attendance"
        title="My Attendance"
        subtitle={`${summary.total} classes marked so far this semester · ${summary.threshold}% threshold required for exam eligibility`}
        action={
          summary.isLow ? <Ribbon tone="crimson">Below threshold</Ribbon> : <Ribbon tone="emerald">On track</Ribbon>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance" value={`${summary.percentage}%`} />
        <StatCard label="Classes Present" value={String(summary.present)} />
        <StatCard label="Classes Absent" value={String(absent)} />
        <StatCard label="Total Classes" value={String(summary.total)} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="ledger-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-serif text-base font-semibold text-slate-900">Progress vs. threshold</p>
            <span className="font-data text-xs text-slate-500">{summary.threshold}% required</span>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${summary.isLow ? 'bg-red-600' : 'bg-green-600'}`}
              style={{ width: `${Math.min(100, summary.percentage)}%` }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-slate-900"
              style={{ left: `${Math.min(100, summary.threshold)}%` }}
              title={`Threshold: ${summary.threshold}%`}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {summary.percentage >= summary.threshold
              ? `You are ${(summary.percentage - summary.threshold).toFixed(1)}% above the minimum. Keep it up.`
              : `You are ${(summary.threshold - summary.percentage).toFixed(1)}% below the minimum — mark the missing ${Math.ceil((summary.threshold - summary.percentage) / 100 * summary.total)} classes to recover.`}
          </p>
        </div>

        <div className="ledger-card p-5">
          <p className="mb-3 font-serif text-base font-semibold text-slate-900">Last 6 sessions</p>
          <div className="flex items-end justify-between gap-2">
            {streak.map((r, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${r.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {r.status === 'PRESENT' ? 'P' : 'A'}
                </span>
                <span className="font-data text-[10px] text-slate-400">
                  {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">Recent Records</h2>
      {summary.records.length === 0 ? (
        <EmptyState title="No attendance recorded yet" hint="Records will appear here once your teachers start taking attendance." />
      ) : (
        <>
          <div className="max-w-xl overflow-hidden rounded-lg border border-slate-200 text-sm">
            <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <span>Date</span>
              <span>Status</span>
            </div>
            {recent.map((r, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 last:border-b-0">
                <span className="text-slate-700">{new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                <Ribbon tone={r.status === 'PRESENT' ? 'emerald' : 'crimson'}>
                  {r.status === 'PRESENT' ? 'Present' : 'Absent'}
                </Ribbon>
              </div>
            ))}
          </div>
          {summary.records.length > recent.length && (
            <p className="mt-2 text-xs text-slate-500">Showing the most recent {recent.length} of {summary.records.length} recorded classes.</p>
          )}
        </>
      )}
    </main>
  );
}