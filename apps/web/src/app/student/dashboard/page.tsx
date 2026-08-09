'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

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
const TODAY_CODE = DAY_ORDER[(new Date().getDay() + 6) % 7]; // JS Sunday=0 -> map to MON..SUN order

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
    <main className="p-8">
      <h1 className="mb-1 text-xl font-semibold">Welcome back{profile?.enrollmentNo ? `, ${profile.enrollmentNo}` : ''}</h1>
      <p className="mb-6 text-sm text-slate-500">{profile?.email}</p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/student/attendance" className="rounded-lg border border-slate-200 p-4 hover:border-slate-400">
          <p className="text-sm text-slate-500">Attendance</p>
          <p className="text-2xl font-semibold">{attendance ? `${attendance.percentage}%` : '—'}</p>
          {attendance?.isLow && <p className="text-xs text-red-600">Below threshold</p>}
        </Link>
        <Link href="/student/results" className="rounded-lg border border-slate-200 p-4 hover:border-slate-400">
          <p className="text-sm text-slate-500">CGPA</p>
          <p className="text-2xl font-semibold">{grades ? grades.cgpa.toFixed(2) : '—'}</p>
        </Link>
        <Link href="/student/timetable" className="rounded-lg border border-slate-200 p-4 hover:border-slate-400">
          <p className="text-sm text-slate-500">Today's Classes</p>
          <p className="text-2xl font-semibold">{todaySlots.length}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 font-medium">Today's Schedule</h2>
          {todaySlots.length === 0 ? (
            <p className="text-sm text-slate-500">No classes scheduled today.</p>
          ) : (
            <div className="space-y-2">
              {todaySlots
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((s, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-medium">{s.section.course.title}</p>
                    <p className="text-slate-500">
                      {s.startTime}-{s.endTime} · Room {s.room.floor.block.name}-{s.room.label}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-2 font-medium">Recent Announcements</h2>
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-500">No announcements yet.</p>
          ) : (
            <div className="space-y-2">
              {announcements.map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
          <Link href="/student/notifications" className="mt-2 inline-block text-sm text-blue-600 underline">
            View all
          </Link>
        </div>
      </div>
    </main>
  );
}
