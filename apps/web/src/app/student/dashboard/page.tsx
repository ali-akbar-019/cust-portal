'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/ui/chart-card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface AttendanceSummary {
  percentage: number;
  isLow: boolean;
  records: {
    date: string;
    status: 'PRESENT' | 'ABSENT';
  }[];
}

interface CourseBreakdown {
  courseCode: string;
  percentage: number;
  letter: string;
}

interface GradesBreakdown {
  cgpa: number;
  semesters: {
    term: string;
    sgpa: number;
    courses: CourseBreakdown[];
  }[];
}

interface SlotView {
  day: string;
  startTime: string;
  endTime: string;
  room: {
    label: string;
    floor: {
      block: {
        name: string;
      };
    };
  };
  section: {
    course: {
      title: string;
    };
  };
}

interface AnnouncementView {
  id: string;
  title: string;
  createdAt: string;
}

interface MySection {
  id: string;
  course: {
    title: string;
    code: string;
  };
}

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const TODAY_CODE = DAY_ORDER[(new Date().getDay() + 6) % 7];

export default function StudentDashboardPage() {
  const { accessToken, profile } = useAuth();

  const [attendance, setAttendance] =
    useState<AttendanceSummary | null>(null);

  const [grades, setGrades] =
    useState<GradesBreakdown | null>(null);

  const [todaySlots, setTodaySlots] =
    useState<SlotView[]>([]);

  const [announcements, setAnnouncements] =
    useState<AnnouncementView[]>([]);

  const [mySections, setMySections] =
    useState<MySection[]>([]);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;

    const studentId = profile.studentId;

    apiFetch<AttendanceSummary>(
      `/attendance/student/${studentId}`,
      { token: accessToken }
    )
      .then(setAttendance)
      .catch(() => { });

    apiFetch<GradesBreakdown>(
      `/grades/student/${studentId}`,
      { token: accessToken }
    )
      .then(setGrades)
      .catch(() => { });

    apiFetch<SlotView[]>(
      `/students/${studentId}/timetable`,
      { token: accessToken }
    )
      .then((slots) => {
        setTodaySlots(
          slots.filter((slot) => slot.day === TODAY_CODE)
        );
      })
      .catch(() => { });

    apiFetch<AnnouncementView[]>(
      '/notifications',
      { token: accessToken }
    )
      .then((items) => {
        setAnnouncements(items.slice(0, 4));
      })
      .catch(() => { });

    apiFetch<MySection[]>(
      `/students/${studentId}/sections`,
      { token: accessToken }
    )
      .then(setMySections)
      .catch(() => { });
  }, [accessToken, profile]);

  const attendanceTrend = useMemo(() => {
    return [...(attendance?.records ?? [])]
      .slice(0, 10)
      .reverse()
      .map((record) => ({
        date: new Date(record.date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        value: record.status === 'PRESENT' ? 1 : 0,
      }));
  }, [attendance]);

  const sortedTodaySlots = useMemo(() => {
    return [...todaySlots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
  }, [todaySlots]);

  const latestSemesterCourses =
    grades?.semesters?.[0]?.courses ?? [];

  const latestSemester =
    grades?.semesters?.[0];

  return (
    <main className="min-w-0 w-full max-w-full overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9 xl:px-10">
      {/* =====================================================
          HEADER
      ====================================================== */}
      <section className="mb-7 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 truncate font-data text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-[11px]">
              {profile?.enrollmentNo ?? 'Student'}
            </p>

            <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Welcome back
            </h1>

            <p className="mt-1 truncate text-sm text-slate-500">
              {profile?.email ?? ''}
            </p>
          </div>

          <Link
            href="/student/timetable"
            className="inline-flex w-full shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow sm:w-auto"
          >
            View timetable
            <span className="ml-2 text-slate-400">→</span>
          </Link>
        </div>
      </section>

      {/* =====================================================
          STAT CARDS
      ====================================================== */}
      <section className="mb-8 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href="/student/attendance"
          label="Attendance"
          value={
            attendance
              ? `${attendance.percentage}%`
              : '—'
          }
          hint={
            attendance?.isLow
              ? 'Below threshold'
              : undefined
          }
        />

        <StatCard
          href="/student/results"
          label="CGPA"
          value={
            grades?.cgpa != null
              ? grades.cgpa.toFixed(2)
              : '—'
          }
        />

        <StatCard
          href="/student/timetable"
          label="Today's Classes"
          value={String(todaySlots.length)}
        />

        <StatCard
          href="/student/enrollment"
          label="Enrolled Courses"
          value={String(mySections.length)}
        />
      </section>

      {/* =====================================================
          CHARTS
      ====================================================== */}
      <section className="mb-8 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Attendance Chart */}
        <ChartCard
          title="Attendance Trend"
          subtitle="Last 10 recorded classes"
        >
          <div className="h-[210px] w-full min-w-0 sm:h-[225px]">
            {attendanceTrend.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center text-sm text-slate-400">
                No attendance records available.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={attendanceTrend}
                  margin={{
                    top: 8,
                    right: 8,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-slate-100)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 10,
                      fill: 'var(--color-slate-400)',
                    }}
                    axisLine={{
                      stroke: 'var(--color-slate-200)',
                    }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />

                  <YAxis
                    domain={[0, 1]}
                    ticks={[0, 1]}
                    tickFormatter={(value) =>
                      value === 1 ? 'P' : 'A'
                    }
                    tick={{
                      fontSize: 10,
                      fill: 'var(--color-slate-400)',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                  />

                  <Tooltip
                    formatter={(value) =>
                      Number(value) === 1
                        ? 'Present'
                        : 'Absent'
                    }
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 10,
                      border:
                        '1px solid var(--color-slate-200)',
                      backgroundColor: '#ffffff',
                      boxShadow:
                        '0 8px 25px rgba(15, 23, 42, 0.08)',
                    }}
                  />

                  <Line
                    type="stepAfter"
                    dataKey="value"
                    stroke="var(--color-slate-900)"
                    strokeWidth={2.5}
                    dot={{
                      r: 3,
                      fill: 'var(--color-slate-900)',
                      strokeWidth: 0,
                    }}
                    activeDot={{
                      r: 5,
                      fill: 'var(--color-slate-900)',
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* Grades Chart */}
        <ChartCard
          title="Latest Semester Grades"
          subtitle={
            latestSemester?.term ??
            'No grades yet'
          }
        >
          <div className="h-[210px] w-full min-w-0 sm:h-[225px]">
            {latestSemesterCourses.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center text-sm text-slate-400">
                No grades available yet.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={latestSemesterCourses}
                  margin={{
                    top: 8,
                    right: 8,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-slate-100)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="courseCode"
                    tick={{
                      fontSize: 9,
                      fill: 'var(--color-slate-400)',
                    }}
                    axisLine={{
                      stroke: 'var(--color-slate-200)',
                    }}
                    tickLine={false}
                    interval={0}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fontSize: 10,
                      fill: 'var(--color-slate-400)',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />

                  <Tooltip
                    formatter={(value) =>
                      `${value ?? 0}%`
                    }
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 10,
                      border:
                        '1px solid var(--color-slate-200)',
                      backgroundColor: '#ffffff',
                      boxShadow:
                        '0 8px 25px rgba(15, 23, 42, 0.08)',
                    }}
                  />

                  <Bar
                    dataKey="percentage"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={42}
                  >
                    {latestSemesterCourses.map(
                      (course, index) => (
                        <Cell
                          key={`${course.courseCode}-${index}`}
                          fill={
                            course.percentage >= 80
                              ? 'var(--color-green-600)'
                              : course.percentage >= 60
                                ? 'var(--color-yellow-500)'
                                : 'var(--color-red-600)'
                          }
                        />
                      )
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </section>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}
      <section className="grid min-w-0 grid-cols-1 gap-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        {/* ===================================================
            LEFT COLUMN
        ==================================================== */}
        <div className="min-w-0 space-y-8">
          {/* Today's Schedule */}
          <section className="min-w-0">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-lg font-semibold text-slate-900 sm:text-xl">
                  Today's Schedule
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  {todaySlots.length > 0
                    ? `${todaySlots.length} scheduled class${todaySlots.length === 1
                      ? ''
                      : 'es'
                    }`
                    : 'Nothing scheduled today'}
                </p>
              </div>

              <Link
                href="/student/timetable"
                className="shrink-0 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
              >
                View all →
              </Link>
            </div>

            {sortedTodaySlots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-5 py-10 text-center shadow-sm backdrop-blur">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                  ✓
                </div>

                <p className="text-sm font-semibold text-slate-700">
                  No classes scheduled today
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  You are free for the day.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedTodaySlots.map(
                  (slot, index) => (
                    <div
                      key={`${slot.startTime}-${slot.endTime}-${index}`}
                      className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm backdrop-blur transition-all hover:border-slate-300 hover:shadow-md sm:p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        {/* Time */}
                        <div className="w-[62px] shrink-0 text-center sm:w-[76px]">
                          <p className="font-data text-sm font-bold text-slate-900 sm:text-base">
                            {slot.startTime}
                          </p>

                          <p className="mt-0.5 font-data text-[10px] text-slate-400">
                            {slot.endTime}
                          </p>
                        </div>

                        {/* Divider */}
                        <div className="h-11 w-px shrink-0 bg-slate-200" />

                        {/* Course */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 sm:text-[15px]">
                            {slot.section.course.title}
                          </p>

                          <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Room
                            </span>

                            <p className="truncate font-data text-xs text-slate-500">
                              {slot.room.floor.block.name}-
                              {slot.room.label}
                            </p>
                          </div>
                        </div>

                        <span className="hidden shrink-0 text-lg text-slate-300 transition-colors group-hover:text-slate-500 sm:block">
                          →
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* My Courses */}
          <section className="min-w-0">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-lg font-semibold text-slate-900 sm:text-xl">
                  My Courses
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  {mySections.length > 0
                    ? `${mySections.length} enrolled course${mySections.length === 1
                      ? ''
                      : 's'
                    }`
                    : 'Currently enrolled courses'}
                </p>
              </div>

              <Link
                href="/student/enrollment"
                className="shrink-0 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
              >
                Enrollment →
              </Link>
            </div>

            {mySections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-5 py-10 text-center shadow-sm backdrop-blur">
                <p className="text-sm font-semibold text-slate-700">
                  No enrolled courses
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Your registered courses will appear here.
                </p>
              </div>
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {mySections.map((section) => (
                  <Link
                    href="/student/enrollment"
                    key={section.id}
                    className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {/* Solid course badge */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-bold uppercase tracking-tight text-white shadow-sm">
                        {section.course.code
                          .slice(0, 4)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-data text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                              {section.course.code}
                            </p>

                            <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                              {section.course.title}
                            </h3>
                          </div>

                          <span className="shrink-0 text-base text-slate-300 transition-colors group-hover:text-slate-700">
                            →
                          </span>
                        </div>

                        <div className="mt-3">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                            Currently enrolled
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ===================================================
            RIGHT COLUMN
        ==================================================== */}
        <div className="min-w-0 space-y-7">
          {/* Announcements */}
          <section className="min-w-0">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-lg font-semibold text-slate-900 sm:text-xl">
                  Recent Announcements
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Latest university updates
                </p>
              </div>

              <Link
                href="/student/notifications"
                className="shrink-0 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
              >
                View all →
              </Link>
            </div>

            {announcements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-5 py-10 text-center shadow-sm backdrop-blur">
                <p className="text-sm font-semibold text-slate-700">
                  No announcements yet
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  New updates will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/85 shadow-sm backdrop-blur">
                <div className="divide-y divide-slate-100">
                  {announcements.map(
                    (announcement) => (
                      <Link
                        key={announcement.id}
                        href="/student/notifications"
                        className="group block min-w-0 p-4 transition-colors hover:bg-slate-50 sm:p-4.5"
                      >
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                            !
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-800">
                              {announcement.title}
                            </p>

                            <p className="mt-1.5 text-[11px] text-slate-400">
                              {new Date(
                                announcement.createdAt
                              ).toLocaleDateString(
                                undefined,
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }
                              )}
                            </p>
                          </div>

                          <span className="mt-1 shrink-0 text-base text-slate-300 transition-colors group-hover:text-slate-700">
                            →
                          </span>
                        </div>
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Academic Overview */}
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-5">
            <div className="mb-4">
              <p className="font-data text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Academic Overview
              </p>

              <h2 className="mt-1 font-serif text-lg font-semibold text-slate-900">
                Current progress
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* CGPA */}
              <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  CGPA
                </p>

                <p className="mt-1 truncate font-data text-xl font-bold text-slate-900">
                  {grades?.cgpa != null
                    ? grades.cgpa.toFixed(2)
                    : '—'}
                </p>
              </div>

              {/* SGPA */}
              <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  SGPA
                </p>

                <p className="mt-1 truncate font-data text-xl font-bold text-slate-900">
                  {latestSemester?.sgpa != null
                    ? latestSemester.sgpa.toFixed(2)
                    : '—'}
                </p>
              </div>

              {/* Attendance */}
              <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Attendance
                </p>

                <p className="mt-1 truncate font-data text-xl font-bold text-slate-900">
                  {attendance?.percentage != null
                    ? `${attendance.percentage}%`
                    : '—'}
                </p>
              </div>

              {/* Courses */}
              <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Courses
                </p>

                <p className="mt-1 truncate font-data text-xl font-bold text-slate-900">
                  {mySections.length}
                </p>
              </div>
            </div>

            <Link
              href="/student/results"
              className="mt-4 flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              View academic record
              <span className="ml-2 text-slate-400">
                →
              </span>
            </Link>
          </section>
        </div>
      </section>
    </main>
  );
}