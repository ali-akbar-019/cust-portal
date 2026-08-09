'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface SlotView {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  room: { label: string; floor: { block: { name: string } } };
  section: { course: { title: string; code: string }; teacher: { user: { email: string } } };
}

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABEL: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat' };
const COURSE_COLORS = [
  'bg-slate-900 text-white',
  'bg-red-600 text-white',
  'bg-blue-600 text-white',
  'bg-green-600 text-white',
  'bg-yellow-500 text-white',
  'bg-slate-700 text-white',
];

export default function StudentTimetablePage() {
  const { accessToken, profile, isLoading: authLoading } = useAuth();
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !accessToken) return;
    if (!profile?.studentId) {
      setError('Could not resolve your student profile. Try logging out and back in.');
      setIsLoading(false);
      return;
    }
    apiFetch<SlotView[]>(`/students/${profile.studentId}/timetable`, { token: accessToken })
      .then(setSlots)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load timetable'))
      .finally(() => setIsLoading(false));
  }, [accessToken, profile, authLoading]);

  if (isLoading) return <main className="p-8 text-sm text-slate-500">Loading timetable...</main>;
  if (error) return <main className="p-8 text-sm text-red-600">{error}</main>;

  // build the calendar grid: rows = distinct start times across the week, columns = days
  const uniqueTimes = [...new Set(slots.map((s) => s.startTime))].sort();
  const courseColorMap = new Map<string, string>();
  [...new Set(slots.map((s) => s.section.course.code))].forEach((code, i) => courseColorMap.set(code, COURSE_COLORS[i % COURSE_COLORS.length]));

  function slotAt(day: string, time: string) {
    return slots.find((s) => s.day === day && s.startTime === time);
  }

  return (
    <main className="p-6 lg:p-10">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Weekly Schedule</p>
      <h1 className="mb-6 font-serif text-2xl font-semibold text-slate-900">My Timetable</h1>

      {slots.length === 0 ? (
        <p className="text-sm text-slate-500">No timetable slots yet — check back after enrollment/scheduling is finalized.</p>
      ) : (
        <div className="scroll-area ledger-card overflow-x-auto p-2">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-20 border-b border-slate-200 p-2 text-left text-xs font-medium uppercase tracking-wide text-slate-400"></th>
                {DAY_ORDER.map((d) => (
                  <th key={d} className="border-b border-slate-200 p-2 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    {DAY_LABEL[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueTimes.map((time) => (
                <tr key={time}>
                  <td className="border-b border-slate-100 p-2 align-top font-data text-xs text-slate-400">{time}</td>
                  {DAY_ORDER.map((day) => {
                    const slot = slotAt(day, time);
                    return (
                      <td key={day} className="border-b border-slate-100 p-1.5 align-top">
                        {slot && (
                          <div className={`rounded-md p-2 text-xs ${courseColorMap.get(slot.section.course.code)}`}>
                            <p className="font-data font-medium">{slot.section.course.code}</p>
                            <p className="opacity-90">{slot.room.floor.block.name}-{slot.room.label}</p>
                            <p className="opacity-75">{slot.startTime}–{slot.endTime}</p>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {slots.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {[...courseColorMap.entries()].map(([code, colorClass]) => (
            <span key={code} className={`rounded px-2 py-1 font-data text-xs ${colorClass}`}>{code}</span>
          ))}
        </div>
      )}
    </main>
  );
}
