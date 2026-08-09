'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/ui/chart-card';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface AttendanceSummary {
  percentage: number;
  isLow: boolean;
  records: { date: string; status: 'PRESENT' | 'ABSENT' }[];
}
interface CourseBreakdown {
  courseCode: string;
  percentage: number;
  letter: string;
}
interface GradesBreakdown {
  cgpa: number;
  semesters: { term: string; sgpa: number; courses: CourseBreakdown[] }[];
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
interface MySection {
  id: string;
  course: { title: string; code: string };
}

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TODAY_CODE = DAY_ORDER[(new Date().getDay() + 6) % 7];

export default function StudentDashboardPage() {
  const { accessToken, profile } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [grades, setGrades] = useState<GradesBreakdown | null>(null);
  const [todaySlots, setTodaySlots] = useState<SlotView[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementView[]>([]);
  const [mySections, setMySections] = useState<MySection[]>([]);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<AttendanceSummary>(`/attendance/student/${profile.studentId}`, { token: accessToken }).then(setAttendance).catch(() => {});
    apiFetch<GradesBreakdown>(`/grades/student/${profile.studentId}`, { token: accessToken }).then(setGrades).catch(() => {});
    apiFetch<SlotView[]>(`/students/${profile.studentId}/timetable`, { token: accessToken })
      .then((slots) => setTodaySlots(slots.filter((s) => s.day === TODAY_CODE)))
      .catch(() => {});
    apiFetch<AnnouncementView[]>('/notifications', { token: accessToken }).then((a) => setAnnouncements(a.slice(0, 4))).catch(() => {});
    apiFetch<MySection[]>(`/students/${profile.studentId}/sections`, { token: accessToken }).then(setMySections).catch(() => {});
  }, [accessToken, profile]);

  // last 10 attendance records, oldest first, as a P=1/A=0 trend
  const attendanceTrend = (attendance?.records ?? [])
    .slice(0, 10)
    .reverse()
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: r.status === 'PRESENT' ? 1 : 0,
    }));

  const latestSemesterCourses = grades?.semesters[0]?.courses ?? [];

  return (
    <main className="p-6 lg:p-10">
      <p className="mb-1 font-data text-xs uppercase tracking-wide text-slate-400">{profile?.enrollmentNo}</p>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-slate-900">Welcome back</h1>
      <p className="mb-8 text-sm text-slate-500">{profile?.email}</p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard href="/student/attendance" label="Attendance" value={attendance ? `${attendance.percentage}%` : '—'} hint={attendance?.isLow ? 'Below threshold' : undefined} />
        <StatCard href="/student/results" label="CGPA" value={grades ? grades.cgpa.toFixed(2) : '—'} />
        <StatCard href="/student/timetable" label="Today's Classes" value={String(todaySlots.length)} />
        <StatCard href="/student/enrollment" label="Enrolled Courses" value={String(mySections.length)} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Attendance Trend" subtitle="Last 10 recorded classes">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={attendanceTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-100)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-slate-400)' }} axisLine={{ stroke: 'var(--color-slate-200)' }} tickLine={false} />
              <YAxis domain={[0, 1]} ticks={[0, 1]} tickFormatter={(v) => (v === 1 ? 'P' : 'A')} tick={{ fontSize: 11, fill: 'var(--color-slate-400)' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip formatter={(v: number) => (v === 1 ? 'Present' : 'Absent')} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-slate-200)' }} />
              <Line type="stepAfter" dataKey="value" stroke="var(--color-slate-900)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-red-600)' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Latest Semester Grades" subtitle={grades?.semesters[0]?.term ?? 'No grades yet'}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={latestSemesterCourses} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-100)" />
              <XAxis dataKey="courseCode" tick={{ fontSize: 10, fill: 'var(--color-slate-400)' }} axisLine={{ stroke: 'var(--color-slate-200)' }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-slate-400)' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-slate-200)' }} />
              <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                {latestSemesterCourses.map((c, i) => (
                  <Cell key={i} fill={c.percentage >= 80 ? 'var(--color-green-600)' : c.percentage >= 60 ? 'var(--color-yellow-500)' : 'var(--color-red-600)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">Today's Schedule</h2>
          {todaySlots.length === 0 ? (
            <p className="text-sm text-slate-500">No classes scheduled today.</p>
          ) : (
            <div className="scroll-area max-h-72 space-y-2 overflow-y-auto pr-1">
              {todaySlots
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((s, i) => (
                  <div key={i} className="ledger-card flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{s.section.course.title}</p>
                      <p className="font-data text-xs text-slate-500">{s.room.floor.block.name}-{s.room.label}</p>
                    </div>
                    <span className="font-data text-xs text-slate-500">{s.startTime}–{s.endTime}</span>
                  </div>
                ))}
            </div>
          )}

          <h2 className="mb-3 mt-6 font-serif text-lg font-semibold text-slate-900">My Courses</h2>
          <div className="flex flex-wrap gap-2">
            {mySections.map((s) => (
              <span key={s.id} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-data text-xs text-slate-600">
                {s.course.code}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">Recent Announcements</h2>
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-500">No announcements yet.</p>
          ) : (
            <div className="scroll-area max-h-72 space-y-2 overflow-y-auto pr-1">
              {announcements.map((a) => (
                <div key={a.id} className="ledger-card p-3 text-sm">
                  <p className="font-medium text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
          <Link href="/student/notifications" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            View all announcements
          </Link>
        </div>
      </div>
    </main>
  );
}
