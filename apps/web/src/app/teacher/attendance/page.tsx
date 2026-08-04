'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface RosterStudent {
  id: string;
  enrollmentNo: string;
  user: { email: string };
  attendances: { status: 'PRESENT' | 'ABSENT' }[];
}

export default function TeacherAttendancePage() {
  const { accessToken } = useAuth();
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRoster() {
    if (!sectionId || !date || !accessToken) return;
    setError(null);
    try {
      const data = await apiFetch<RosterStudent[]>(
        `/attendance/section/${sectionId}/roster?date=${date}`,
        { token: accessToken },
      );
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

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Mark Attendance</h1>

      <div className="mb-4 flex max-w-lg gap-2">
        <input
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          placeholder="Section ID"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button onClick={loadRoster} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Load
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-3 text-sm text-green-600">{message}</p>}

      {roster.length > 0 && (
        <>
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
