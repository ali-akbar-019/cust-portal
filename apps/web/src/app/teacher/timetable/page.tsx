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
  section: { course: { title: string; code: string } };
}

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function TeacherTimetablePage() {
  const { accessToken, profile } = useAuth();
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !profile?.teacherId) return;
    apiFetch<SlotView[]>(`/teachers/${profile.teacherId}/timetable`, { token: accessToken })
      .then(setSlots)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load timetable'))
      .finally(() => setIsLoading(false));
  }, [accessToken, profile]);

  if (isLoading) return <main className="p-8 text-sm text-slate-500">Loading timetable...</main>;
  if (error) return <main className="p-8 text-sm text-red-600">{error}</main>;

  return (
    <main className="p-8">
      <h1 className="mb-6 text-xl font-semibold">My Teaching Schedule</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DAY_ORDER.map((day) => {
          const daySlots = slots.filter((s) => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
          if (daySlots.length === 0) return null;
          return (
            <div key={day} className="rounded-lg border border-slate-200 p-4">
              <h2 className="mb-2 font-medium">{day}</h2>
              {daySlots.map((s) => (
                <div key={s.id} className="mb-2 rounded bg-slate-50 p-2 text-sm">
                  <p className="font-medium">{s.section.course.title}</p>
                  <p className="text-slate-500">
                    {s.startTime}-{s.endTime} · Room {s.room.floor.block.name}-{s.room.label}
                  </p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </main>
  );
}
