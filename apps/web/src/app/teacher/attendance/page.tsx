'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface MySection {
  id: string;
  course: { title: string; code: string };
  enrolledCount: number;
}
interface RosterStudent {
  id: string;
  enrollmentNo: string;
  user: { email: string };
  attendances: { status: 'PRESENT' | 'ABSENT' }[];
}

export default function TeacherAttendancePage() {
  const { accessToken, profile } = useAuth();
  const [mySections, setMySections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !profile?.teacherId) return;
    apiFetch<MySection[]>(`/teachers/${profile.teacherId}/sections`, { token: accessToken })
      .then((sections) => {
        setMySections(sections);
        if (sections.length > 0) setSectionId(sections[0]?.id ?? '');
      })
      .catch(() => {});
  }, [accessToken, profile]);

  async function loadRoster() {
    if (!sectionId || !date || !accessToken) return;
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<RosterStudent[]>(`/attendance/section/${sectionId}/roster?date=${date}`, { token: accessToken });
      setRoster(data);
      const initial: Record<string, 'PRESENT' | 'ABSENT'> = {};
      data.forEach((s) => {
        initial[s.id] = s.attendances[0]?.status ?? 'PRESENT';
      });
      setStatuses(initial);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load roster');
    }
  }

  useEffect(() => {
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, date]);

  function markAll(status: 'PRESENT' | 'ABSENT') {
    const next: Record<string, 'PRESENT' | 'ABSENT'> = {};
    roster.forEach((s) => (next[s.id] = status));
    setStatuses(next);
  }

  async function handleSubmit() {
    setMessage(null);
    setError(null);
    try {
      const records = Object.entries(statuses).map(([studentId, status]) => ({ studentId, status }));
      const res = await apiFetch<{ markedCount: number }>('/attendance/mark', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ sectionId, date, records }),
      });
      setMessage(`Attendance recorded for ${res.markedCount} students — re-marking updates today's sheet in place.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit attendance');
    }
  }

  const presentCount = Object.values(statuses).filter((s) => s === 'PRESENT').length;
  const absentCount = roster.length - presentCount;
  const currentCourse = mySections.find((s) => s.id === sectionId);

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Faculty"
        title="Mark Attendance"
        subtitle="Take the register for a section on a given date. Re-marking the same date updates the sheet instead of duplicating rows."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Course</p>
          <p className="font-data text-sm font-semibold text-slate-900">{currentCourse?.course.code ?? '—'}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Present</p>
          <p className="font-serif text-2xl font-semibold text-green-700">{presentCount}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Absent</p>
          <p className="font-serif text-2xl font-semibold text-red-600">{absentCount}</p>
        </div>
      </div>

      <div className="mb-6 flex max-w-lg flex-col gap-2 sm:flex-row">
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {mySections.length === 0 && <option value="">No sections assigned</option>}
          {mySections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.course.title} ({s.course.code}) · {s.enrolledCount} students
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}

      {roster.length === 0 ? (
        sectionId && <p className="text-sm text-slate-500">No students enrolled in this section yet — the roster will appear once they enroll.</p>
      ) : (
        <>
          <div className="mb-2 flex max-w-lg flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              <Ribbon tone="emerald">{presentCount} present</Ribbon>{' '}
              <Ribbon tone="crimson">{absentCount} absent</Ribbon>
            </p>
            <div className="flex gap-3">
              <button onClick={() => markAll('PRESENT')} className="text-xs font-medium text-green-700 underline">
                Mark all present
              </button>
              <button onClick={() => markAll('ABSENT')} className="text-xs font-medium text-red-600 underline">
                Mark all absent
              </button>
            </div>
          </div>

          <div className="scroll-area mb-4 max-h-96 max-w-lg divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {roster.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-data text-slate-700">{s.enrollmentNo}</span>
                  <span className="block truncate text-xs text-slate-400">{s.user.email}</span>
                </span>
                <div className="flex gap-1.5">
                  {(['PRESENT', 'ABSENT'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setStatuses((prev) => ({ ...prev, [s.id]: opt }))}
                      aria-label={`Mark ${s.enrollmentNo} ${opt.toLowerCase()}`}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        statuses[s.id] === opt
                          ? opt === 'PRESENT'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {opt === 'PRESENT' ? 'Present' : 'Absent'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSubmit} className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
            Submit Attendance
          </button>
        </>
      )}
    </main>
  );
}