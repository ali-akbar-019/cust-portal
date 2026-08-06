'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface AttendanceSummary {
  total: number;
  present: number;
  percentage: number;
  isLow: boolean;
  threshold: number;
  records: { date: string; status: 'PRESENT' | 'ABSENT' }[];
}

export default function StudentAttendancePage() {
  const { accessToken, profile } = useAuth();
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<AttendanceSummary>(`/attendance/student/${profile.studentId}`, { token: accessToken })
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load attendance'));
  }, [accessToken, profile]);

  if (error) return <main className="p-8 text-sm text-red-600">{error}</main>;
  if (!summary) return <main className="p-8 text-sm text-slate-500">Loading...</main>;

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">My Attendance</h1>

      <div className="mb-6 max-w-sm rounded-lg border border-slate-200 p-4">
        <p className="text-3xl font-semibold">{summary.percentage}%</p>
        <p className="text-sm text-slate-500">
          {summary.present} present out of {summary.total} classes
        </p>
        {summary.isLow && (
          <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            Below the {summary.threshold}% threshold — attendance may affect your eligibility for exams.
          </p>
        )}
      </div>

      <div className="max-w-sm divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
        {summary.records.map((r, i) => (
          <div key={i} className="flex justify-between px-4 py-2">
            <span>{new Date(r.date).toLocaleDateString()}</span>
            <span className={r.status === 'PRESENT' ? 'text-green-600' : 'text-red-600'}>{r.status}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
