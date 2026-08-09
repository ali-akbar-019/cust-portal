'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

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
        if (sections.length > 0) setSectionId(sections[0].id);
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
      setMessage(`Marked attendance for ${res.markedCount} students.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit attendance');
    }
  }

  const presentCount = Object.values(statuses).filter((s) => s === 'PRESENT').length;

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Mark Attendance</h1>

      <div className="mb-4 flex max-w-lg gap-2">
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
      {message && <p className="mb-3 text-sm text-green-600">{message}</p>}

      {roster.length === 0 ? (
        sectionId && <p className="text-sm text-slate-500">No students enrolled in this section yet.</p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between max-w-lg">
            <p className="text-sm text-slate-500">
              {presentCount}/{roster.length} marked present
            </p>
            <div className="flex gap-2">
              <button onClick={() => markAll('PRESENT')} className="text-xs text-green-700 underline">
                Mark all present
              </button>
              <button onClick={() => markAll('ABSENT')} className="text-xs text-red-700 underline">
                Mark all absent
              </button>
            </div>
          </div>
          <div className="mb-4 max-w-lg divide-y divide-slate-200 rounded-md border border-slate-200">
            {roster.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  {s.enrollmentNo} · {s.user.email}
                </span>
                <div className="flex gap-2">
                  {(['PRESENT', 'ABSENT'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setStatuses((prev) => ({ ...prev, [s.id]: opt }))}
                      className={`rounded px-2 py-1 text-xs ${
                        statuses[s.id] === opt
                          ? opt === 'PRESENT'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {opt === 'PRESENT' ? 'P' : 'A'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSubmit} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
            Submit Attendance
          </button>
        </>
      )}
    </main>
  );
}
