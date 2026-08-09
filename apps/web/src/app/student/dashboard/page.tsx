'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { StatCard } from '@/components/ui/stat-card';

interface AttendanceSummary {
  percentage: number;
  isLow: boolean;
}
interface GradesBreakdown {
  cgpa: number;
}
interface SlotView {
  day: string;
  startTime: string;
  endTime: string;
  room: { label: string; floor: { block: { name: string } } };
  section: { course: { title: string } };
}
interface AnnouncementView {
  id: string;
  title: string;
  createdAt: string;
}

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TODAY_CODE = DAY_ORDER[(new Date().getDay() + 6) % 7];

export default function StudentDashboardPage() {
  const { accessToken, profile } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [grades, setGrades] = useState<GradesBreakdown | null>(null);
  const [todaySlots, setTodaySlots] = useState<SlotView[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementView[]>([]);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<AttendanceSummary>(`/attendance/student/${profile.studentId}`, { token: accessToken }).then(setAttendance).catch(() => {});
    apiFetch<GradesBreakdown>(`/grades/student/${profile.studentId}`, { token: accessToken }).then(setGrades).catch(() => {});
    apiFetch<SlotView[]>(`/students/${profile.studentId}/timetable`, { token: accessToken })
      .then((slots) => setTodaySlots(slots.filter((s) => s.day === TODAY_CODE)))
      .catch(() => {});
    apiFetch<AnnouncementView[]>('/notifications', { token: accessToken }).then((a) => setAnnouncements(a.slice(0, 3))).catch(() => {});
  }, [accessToken, profile]);

  return (
    <main className="p-6 lg:p-10">
      <p className="mb-1 font-data text-xs uppercase tracking-wide text-slate-400">{profile?.enrollmentNo}</p>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-slate-900">Welcome back</h1>
      <p className="mb-8 text-sm text-slate-500">{profile?.email}</p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard href="/student/attendance" label="Attendance" value={attendance ? `${attendance.percentage}%` : '—'} hint={attendance?.isLow ? 'Below threshold' : undefined} />
        <StatCard href="/student/results" label="CGPA" value={grades ? grades.cgpa.toFixed(2) : '—'} />
        <StatCard href="/student/timetable" label="Today's Classes" value={String(todaySlots.length)} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">Today's Schedule</h2>
          {todaySlots.length === 0 ? (
            <p className="text-sm text-slate-500">No classes scheduled today.</p>
          ) : (
            <div className="space-y-2">
              {todaySlots
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((s, i) => (
                  <div key={i} className="ledger-card p-3 text-sm">
                    <p className="font-medium text-slate-900">{s.section.course.title}</p>
                    <p className="font-data text-xs text-slate-500">
                      {s.startTime}–{s.endTime} · {s.room.floor.block.name}-{s.room.label}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">Recent Announcements</h2>
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-500">No announcements yet.</p>
          ) : (
            <div className="space-y-2">
              {announcements.map((a) => (
                <div key={a.id} className="ledger-card p-3 text-sm">
                  <p className="font-medium text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
          <Link href="/student/notifications" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
      </div>
    </main>
  );
}
