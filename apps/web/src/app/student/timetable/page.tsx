'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface SlotView {
  id: string;
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
      code: string;
    };
    teacher: {
      user: {
        email: string;
      };
    };
  };
}

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const DAY_LABEL: Record<string, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};

const COURSE_COLORS = [
  'bg-slate-900',
  'bg-red-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-500',
  'bg-violet-600',
  'bg-cyan-600',
  'bg-rose-600',
];

const getTodayCode = () => {
  const day = new Date().getDay();

  if (day === 0) return 'MON';

  return DAY_ORDER[day - 1] ?? 'MON';
};

export default function StudentTimetablePage() {
  const {
    accessToken,
    profile,
    isLoading: authLoading,
  } = useAuth();

  const [slots, setSlots] = useState<SlotView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!accessToken) {
      setIsLoading(false);
      setError('Your session has expired. Please log in again.');
      return;
    }

    if (!profile?.studentId) {
      setIsLoading(false);
      setError(
        'Could not resolve your student profile. Try logging out and back in.'
      );
      return;
    }

    const studentId = profile.studentId;

    setIsLoading(true);
    setError(null);

    apiFetch<SlotView[]>(
      `/students/${studentId}/timetable`,
      { token: accessToken }
    )
      .then((data) => {
        setSlots(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load timetable.'
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [accessToken, profile?.studentId, authLoading]);

  /*
   * Current day.
   */
  const todayCode = useMemo(() => getTodayCode(), []);

  /*
   * Unique course codes.
   */
  const courseCodes = useMemo(() => {
    return [...new Set(
      slots
        .map((slot) => slot.section?.course?.code)
        .filter(Boolean)
    )];
  }, [slots]);

  /*
   * Assign one solid color to every course.
   */
  const courseColorMap = useMemo(() => {
    const map = new Map<string, string>();

    courseCodes.forEach((code, index) => {
      map.set(
        code,
        COURSE_COLORS[index % COURSE_COLORS.length] ?? 'bg-slate-900'
      );
    });

    return map;
  }, [courseCodes]);

  /*
   * Unique starting times.
   */
  const uniqueTimes = useMemo(() => {
    return [...new Set(
      slots
        .map((slot) => slot.startTime)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }, [slots]);

  /*
   * Fast timetable lookup.
   *
   * Instead of doing slots.find() for every cell,
   * create a map once.
   */
  const slotMap = useMemo(() => {
    const map = new Map<string, SlotView>();

    slots.forEach((slot) => {
      map.set(`${slot.day}-${slot.startTime}`, slot);
    });

    return map;
  }, [slots]);

  /*
   * Group slots by day for mobile/tablet layout.
   */
  const slotsByDay = useMemo(() => {
    const grouped: Record<string, SlotView[]> = {};

    DAY_ORDER.forEach((day) => {
      grouped[day] = [];
    });

    slots.forEach((slot) => {
      if (!grouped[slot.day]) {
        grouped[slot.day] = [];
      }

      grouped[slot.day]?.push(slot);
    });

    Object.values(grouped).forEach((daySlots) => {
      daySlots.sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );
    });

    return grouped;
  }, [slots]);

  /*
   * Loading state.
   */
  if (isLoading) {
    return (
      <main className="w-full min-w-0 p-4 sm:p-6 lg:p-8 xl:p-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-7">
            <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-8 w-48 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {DAY_ORDER.map((day) => (
                <div
                  key={day}
                  className="h-28 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * Error state.
   */
  if (error) {
    return (
      <main className="w-full min-w-0 p-4 sm:p-6 lg:p-8 xl:p-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">
            <p className="text-sm font-semibold text-red-800">
              Unable to load timetable
            </p>

            <p className="mt-1 text-sm leading-6 text-red-600">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8 xl:p-10">
      <div className="mx-auto w-full max-w-7xl">
        {/* =====================================================
            HEADER
        ====================================================== */}
        <header className="mb-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="font-data text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Weekly Schedule
              </p>

              <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                My Timetable
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Your weekly classes, rooms, and schedule at a glance.
              </p>
            </div>

            {slots.length > 0 && (
              <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-slate-900" />

                <span className="font-data text-xs font-medium text-slate-600">
                  {slots.length} class{slots.length === 1 ? '' : 'es'}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* =====================================================
            EMPTY STATE
        ====================================================== */}
        {slots.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm sm:px-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-500">
              —
            </div>

            <h2 className="mt-4 text-sm font-semibold text-slate-800">
              No timetable available
            </h2>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
              No classes have been assigned to your timetable yet.
              Check back after enrollment or scheduling is finalized.
            </p>
          </section>
        ) : (
          <>
            {/* =================================================
                DESKTOP TIMETABLE
            ================================================== */}
            <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Weekly Overview
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Click-free overview of your scheduled classes.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-slate-900" />
                    Today
                  </div>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse">
                  <thead>
                    <tr>
                      <th className="w-24 border-b border-r border-slate-100 bg-slate-50/70 px-4 py-3 text-left">
                        <span className="font-data text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Time
                        </span>
                      </th>

                      {DAY_ORDER.map((day) => {
                        const isToday = day === todayCode;

                        return (
                          <th
                            key={day}
                            className={`
                              min-w-[140px]
                              border-b
                              border-slate-100
                              px-3
                              py-3
                              text-left
                              ${isToday ? 'bg-slate-50' : ''}
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`
                                  text-xs
                                  font-semibold
                                  ${isToday
                                    ? 'text-slate-900'
                                    : 'text-slate-600'}
                                `}
                              >
                                {DAY_LABEL[day]}
                              </span>

                              {isToday && (
                                <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                                  Today
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {uniqueTimes.map((time) => (
                      <tr key={time}>
                        <td className="border-b border-r border-slate-100 bg-slate-50/50 px-4 py-3 align-top">
                          <span className="font-data text-xs font-medium text-slate-500">
                            {time}
                          </span>
                        </td>

                        {DAY_ORDER.map((day) => {
                          const slot = slotMap.get(`${day}-${time}`);
                          const isToday = day === todayCode;

                          return (
                            <td
                              key={day}
                              className={`
                                border-b
                                border-slate-100
                                p-2
                                align-top
                                ${isToday ? 'bg-slate-50/40' : ''}
                              `}
                            >
                              {slot ? (
                                <TimetableCourse
                                  slot={slot}
                                  colorClass={
                                    courseColorMap.get(
                                      slot.section.course.code
                                    ) ?? 'bg-slate-900'
                                  }
                                />
                              ) : (
                                <div className="min-h-[82px] rounded-xl border border-transparent" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* =================================================
                TABLET / MOBILE DAY CARDS
            ================================================== */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
              {DAY_ORDER.map((day) => {
                const daySlots = slotsByDay[day] ?? [];
                const isToday = day === todayCode;

                return (
                  <div
                    key={day}
                    className={`
                      min-w-0
                      overflow-hidden
                      rounded-2xl
                      border
                      bg-white
                      shadow-sm
                      ${isToday
                        ? 'border-slate-300'
                        : 'border-slate-200'}
                    `}
                  >
                    {/* Day header */}
                    <div
                      className={`
                        flex
                        items-center
                        justify-between
                        gap-3
                        border-b
                        px-4
                        py-3
                        ${isToday
                          ? 'border-slate-200 bg-slate-50'
                          : 'border-slate-100'}
                      `}
                    >
                      <div className="min-w-0">
                        <p
                          className={`
                            text-sm
                            font-semibold
                            ${isToday
                              ? 'text-slate-900'
                              : 'text-slate-700'}
                          `}
                        >
                          {DAY_LABEL[day]}
                        </p>

                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {daySlots.length === 0
                            ? 'No classes'
                            : `${daySlots.length} class${daySlots.length === 1 ? '' : 'es'}`}
                        </p>
                      </div>

                      {isToday && (
                        <span className="shrink-0 rounded-full bg-slate-900 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Day courses */}
                    <div className="p-3">
                      {daySlots.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center">
                          <p className="text-xs text-slate-400">
                            Nothing scheduled
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {daySlots.map((slot) => (
                            <TimetableCourse
                              key={slot.id}
                              slot={slot}
                              colorClass={
                                courseColorMap.get(
                                  slot.section.course.code
                                ) ?? 'bg-slate-900'
                              }
                              mobile
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* =================================================
                COURSE LEGEND
            ================================================== */}
            {courseCodes.length > 0 && (
              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Courses
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Course color reference
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {courseCodes.map((code) => {
                    const color =
                      courseColorMap.get(code) ?? 'bg-slate-900';

                    return (
                      <div
                        key={code}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${color}`}
                        />

                        <span className="max-w-[180px] truncate font-data text-[10px] font-semibold text-slate-600 sm:max-w-none">
                          {code}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/* ============================================================
   COURSE CARD
============================================================ */

function TimetableCourse({
  slot,
  colorClass,
  mobile = false,
}: {
  slot: SlotView;
  colorClass: string;
  mobile?: boolean;
}) {
  const course = slot.section?.course;
  const room = slot.room;
  const teacherEmail = slot.section?.teacher?.user?.email;

  const teacherName = teacherEmail
    ? teacherEmail.split('@')[0]?.replace(/[._-]/g, ' ')
    : null;

  if (mobile) {
    return (
      <div className="group min-w-0 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 hover:bg-slate-50">
        <div className="flex min-w-0 gap-3">
          <div
            className={`h-auto w-1 shrink-0 rounded-full ${colorClass}`}
          />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-data text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {course?.code ?? 'Course'}
                </p>

                <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                  {course?.title ?? 'Untitled course'}
                </h3>
              </div>

              <span className="shrink-0 font-data text-[10px] font-medium text-slate-500">
                {slot.startTime}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
              <span>
                {slot.startTime}–{slot.endTime}
              </span>

              <span className="text-slate-300">•</span>

              <span className="truncate">
                {room?.floor?.block?.name ?? 'Block'}
                -
                {room?.label ?? 'Room'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        min-h-[82px]
        overflow-hidden
        rounded-xl
        p-3
        text-white
        shadow-sm
        ${colorClass}
      `}
    >
      <div className="flex h-full min-w-0 flex-col">
        <p className="font-data text-[10px] font-semibold uppercase tracking-wide text-white/70">
          {course?.code ?? 'Course'}
        </p>

        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4">
          {course?.title ?? 'Untitled course'}
        </p>

        <div className="mt-auto pt-3">
          <p className="truncate text-[10px] text-white/75">
            {room?.floor?.block?.name ?? 'Block'}
            -
            {room?.label ?? 'Room'}
          </p>

          <p className="mt-0.5 font-data text-[9px] text-white/60">
            {slot.startTime}–{slot.endTime}
          </p>
        </div>
      </div>
    </div>
  );
}