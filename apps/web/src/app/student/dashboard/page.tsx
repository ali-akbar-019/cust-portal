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
      code?: string;
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
  enrolledCount?: number;
}

const DAY_ORDER = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
];

const TODAY_CODE =
  DAY_ORDER[(new Date().getDay() + 6) % 7];

function getCourseInitials(title: string) {
  return title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

function getCourseTone(index: number) {
  const tones = [
    'bg-slate-100 text-slate-700 border-slate-200',
    'bg-red-50 text-red-700 border-red-100',
    'bg-amber-50 text-amber-700 border-amber-100',
    'bg-emerald-50 text-emerald-700 border-emerald-100',
    'bg-violet-50 text-violet-700 border-violet-100',
    'bg-sky-50 text-sky-700 border-sky-100',
  ];

  return tones[index % tones.length];
}

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

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const studentId = profile.studentId;

    Promise.allSettled([
      apiFetch<AttendanceSummary>(
        `/attendance/student/${studentId}`,
        { token: accessToken }
      ).then(setAttendance),

      apiFetch<GradesBreakdown>(
        `/grades/student/${studentId}`,
        { token: accessToken }
      ).then(setGrades),

      apiFetch<SlotView[]>(
        `/students/${studentId}/timetable`,
        { token: accessToken }
      ).then((slots) => {
        setTodaySlots(
          slots.filter(
            (slot) => slot.day === TODAY_CODE
          )
        );
      }),

      apiFetch<AnnouncementView[]>(
        '/notifications',
        { token: accessToken }
      ).then((items) => {
        setAnnouncements(items.slice(0, 4));
      }),

      apiFetch<MySection[]>(
        `/students/${studentId}/sections`,
        { token: accessToken }
      ).then(setMySections),
    ]).finally(() => {
      setLoading(false);
    });
  }, [accessToken, profile?.studentId]);

  /*
   * Attendance trend.
   *
   * Do not mutate the original API array.
   */
  const attendanceTrend = useMemo(() => {
    return [...(attendance?.records ?? [])]
      .slice(0, 10)
      .reverse()
      .map((record) => ({
        date: new Date(
          record.date
        ).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        value:
          record.status === 'PRESENT' ? 1 : 0,
      }));
  }, [attendance]);

  const latestSemester =
    grades?.semesters[0];

  const latestSemesterCourses =
    latestSemester?.courses ?? [];

  const sortedTodaySlots = useMemo(() => {
    return [...todaySlots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
  }, [todaySlots]);

  return (
    <main className="min-w-0 max-w-full overflow-x-hidden bg-slate-50/40 p-4 sm:p-6 lg:p-10">
      {/* =========================================================
          HEADER
      ========================================================= */}
      <section className="mb-7 min-w-0">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 font-data text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
              {profile?.enrollmentNo ?? 'Student'}
            </p>

            <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Welcome back
            </h1>

            <p className="mt-1 max-w-full truncate text-sm text-slate-500">
              {profile?.email}
            </p>
          </div>

          <Link
            href="/student/timetable"
            className="inline-flex w-full shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
          >
            View timetable
          </Link>
        </div>
      </section>

      {/* =========================================================
          STATS
      ========================================================= */}
      <section className="mb-7 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            grades
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

      {/* =========================================================
          CHARTS
      ========================================================= */}
      <section className="mb-8 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Attendance Trend"
          subtitle="Last 10 recorded classes"
        >
          <div className="h-[210px] w-full min-w-0 sm:h-[230px]">
            {attendanceTrend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No attendance records yet.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={attendanceTrend}
                  margin={{
                    top: 10,
                    right: 8,
                    left: -22,
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
                      stroke:
                        'var(--color-slate-200)',
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
                    formatter={(value: number) =>
                      value === 1
                        ? 'Present'
                        : 'Absent'
                    }
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border:
                        '1px solid var(--color-slate-200)',
                      boxShadow:
                        '0 4px 12px rgba(15, 23, 42, 0.08)',
                    }}
                  />

                  <Line
                    type="stepAfter"
                    dataKey="value"
                    stroke="var(--color-slate-900)"
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      fill: 'var(--color-red-600)',
                    }}
                    activeDot={{
                      r: 5,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Latest Semester Grades"
          subtitle={
            latestSemester?.term ??
            'No grades yet'
          }
        >
          <div className="h-[210px] w-full min-w-0 sm:h-[230px]">
            {latestSemesterCourses.length ===
              0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
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
                    top: 10,
                    right: 8,
                    left: -22,
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
                      fontSize: 10,
                      fill: 'var(--color-slate-400)',
                    }}
                    axisLine={{
                      stroke:
                        'var(--color-slate-200)',
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
                    formatter={(value: number) =>
                      `${value}%`
                    }
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border:
                        '1px solid var(--color-slate-200)',
                      boxShadow:
                        '0 4px 12px rgba(15, 23, 42, 0.08)',
                    }}
                  />

                  <Bar
                    dataKey="percentage"
                    radius={[4, 4, 0, 0]}
                  >
                    {latestSemesterCourses.map(
                      (course, index) => (
                        <Cell
                          key={`${course.courseCode}-${index}`}
                          fill={
                            course.percentage >= 80
                              ? 'var(--color-green-600)'
                              : course.percentage >=
                                60
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

      {/* =========================================================
          MAIN CONTENT
      ========================================================= */}
      <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        {/* LEFT */}
        <div className="min-w-0 space-y-6">
          {/* Today's Schedule */}
          <section className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-lg font-semibold text-slate-900">
                  Today's Schedule
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  {sortedTodaySlots.length === 0
                    ? 'Nothing scheduled today'
                    : `${sortedTodaySlots.length} class${sortedTodaySlots.length === 1
                      ? ''
                      : 'es'
                    } today`}
                </p>
              </div>

              <Link
                href="/student/timetable"
                className="shrink-0 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Full timetable →
              </Link>
            </div>

            {sortedTodaySlots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  ✓
                </div>

                <p className="text-sm font-medium text-slate-700">
                  No classes today
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Enjoy the free time or check your
                  upcoming timetable.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedTodaySlots.map(
                  (slot, index) => (
                    <div
                      key={`${slot.startTime}-${slot.endTime}-${index}`}
                      className="group min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
                    >
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        {/* Time */}
                        <div className="w-[72px] shrink-0 text-center sm:w-[86px]">
                          <p className="font-data text-sm font-semibold text-slate-900">
                            {slot.startTime}
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {slot.endTime}
                          </p>
                        </div>

                        <div className="h-10 w-px shrink-0 bg-slate-200" />

                        {/* Course */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {slot.section.course.title}
                          </p>

                          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                            {slot.section.course
                              .code && (
                                <>
                                  <span className="font-data font-medium text-slate-500">
                                    {
                                      slot.section.course
                                        .code
                                    }
                                  </span>

                                  <span>•</span>
                                </>
                              )}

                            <span className="truncate">
                              {
                                slot.room.floor.block
                                  .name
                              }
                              -
                              {slot.room.label}
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <span className="hidden shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500 sm:block">
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
            <div className="mb-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-lg font-semibold text-slate-900">
                  My Courses
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  {mySections.length > 0
                    ? `${mySections.length} course${mySections.length === 1
                      ? ''
                      : 's'
                    } currently enrolled`
                    : 'Your enrolled courses'}
                </p>
              </div>

              <Link
                href="/student/enrollment"
                className="shrink-0 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                View enrollment →
              </Link>
            </div>

            {mySections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No enrolled courses
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Your registered courses will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {mySections.map(
                  (section, index) => {
                    const initials =
                      getCourseInitials(
                        section.course.title
                      );

                    const tone =
                      getCourseTone(index);

                    return (
                      <Link
                        href="/student/enrollment"
                        key={section.id}
                        className="group min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${tone}`}
                          >
                            {initials ||
                              section.course.code
                                .slice(0, 2)
                                .toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-data text-xs font-semibold tracking-wide text-slate-500">
                                  {
                                    section.course
                                      .code
                                  }
                                </p>

                                <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                                  {
                                    section.course
                                      .title
                                  }
                                </h3>
                              </div>

                              <span className="shrink-0 text-slate-300 transition group-hover:text-slate-600">
                                →
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500">
                                Enrolled
                              </span>

                              {section.enrolledCount !==
                                undefined && (
                                  <span className="text-[10px] text-slate-400">
                                    {
                                      section.enrolledCount
                                    }{' '}
                                    students
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT */}
        <aside className="min-w-0">
          <section className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-lg font-semibold text-slate-900">
                  Recent Announcements
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Latest updates from the university
                </p>
              </div>

              <Link
                href="/student/notifications"
                className="shrink-0 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                View all →
              </Link>
            </div>

            {announcements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No announcements yet
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  New university updates will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-100">
                  {announcements.map(
                    (announcement) => (
                      <Link
                        href="/student/notifications"
                        key={announcement.id}
                        className="group block min-w-0 p-4 transition hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                            !
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium leading-5 text-slate-800 group-hover:text-slate-950">
                              {
                                announcement.title
                              }
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
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

                          <span className="mt-1 shrink-0 text-slate-300 transition group-hover:text-slate-600">
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

          {/* Academic snapshot */}
          <section className="mt-6 min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Academic snapshot
              </p>

              <h2 className="mt-1 font-serif text-lg font-semibold text-slate-900">
                Your progress
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  CGPA
                </p>

                <p className="mt-1 font-data text-xl font-semibold text-slate-900">
                  {grades
                    ? grades.cgpa.toFixed(2)
                    : '—'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  Latest SGPA
                </p>

                <p className="mt-1 font-data text-xl font-semibold text-slate-900">
                  {latestSemester
                    ? latestSemester.sgpa.toFixed(
                      2
                    )
                    : '—'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  Attendance
                </p>

                <p className="mt-1 font-data text-xl font-semibold text-slate-900">
                  {attendance
                    ? `${attendance.percentage}%`
                    : '—'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  Courses
                </p>

                <p className="mt-1 font-data text-xl font-semibold text-slate-900">
                  {mySections.length}
                </p>
              </div>
            </div>

            <Link
              href="/student/results"
              className="mt-4 flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              View complete academic record
            </Link>
          </section>
        </aside>
      </section>

      {/* =========================================================
          LOADING INDICATOR
      ========================================================= */}
      {loading && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
          Updating dashboard…
        </div>
      )}
    </main>
  );
}