'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import {
  AdminButton,
  AdminMessage,
  AdminPill,
  AdminSectionHeading,
  AdminSurface,
  selectClass,
} from '../_components/admin-ui';

interface GenerateResult {
  placedCount: number;
  unplacedSectionIds: string[];
}

interface Department {
  id: string;
  name: string;
  code: string;
}

type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

interface DeptSlot {
  id: string;
  day: Day;
  startTime: string;
  endTime: string;
  room: {
    id: string;
    label: string;
    type: string;
    floor: {
      floorNumber: number;
      block: {
        name: string;
      };
    };
  };
}

interface DeptSection {
  id: string;
  term: string;
  capacity: number;
  course: {
    code: string;
    title: string;
    creditHours: number;
  };
  teacher: {
    user: {
      email: string;
    };
  };
  _count: {
    enrollments: number;
  };
  enrollments: {
    student: {
      id: string;
      enrollmentNo: string;
      semester: number;
    };
  }[];
  slots: DeptSlot[];
}

interface GridEntry {
  slot: DeptSlot;
  section: DeptSection;
}

interface TimetableGrid {
  times: string[];
  dayRows: Record<Day, Map<string, GridEntry[]>>;
}

const DAYS: readonly Day[] = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
];

const DAY_LABEL: Record<Day, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};

function toMinutes(time?: string): number {
  if (!time) return 0;

  const [hours, minutes] = time.split(':').map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return 0;
  }

  return hours * 60 + minutes;
}

function formatTime(time?: string): string {
  if (!time) return '—';

  const [hoursString, minutesString] = time.split(':');

  const hours = Number(hoursString);
  const minutes = Number(minutesString);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return time;
  }

  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${String(minutes).padStart(
    2,
    '0',
  )} ${suffix}`;
}

function createGrid(
  sections: DeptSection[],
): TimetableGrid {
  const dayRows: Record<
    Day,
    Map<string, GridEntry[]>
  > = {
    MON: new Map(),
    TUE: new Map(),
    WED: new Map(),
    THU: new Map(),
    FRI: new Map(),
    SAT: new Map(),
  };

  const allTimes = new Set<string>();

  for (const section of sections) {
    const slots = Array.isArray(section.slots)
      ? section.slots
      : [];

    for (const slot of slots) {
      if (!DAYS.includes(slot.day)) {
        continue;
      }

      if (!slot.startTime) {
        continue;
      }

      allTimes.add(slot.startTime);

      const rows = dayRows[slot.day];

      if (!rows.has(slot.startTime)) {
        rows.set(slot.startTime, []);
      }

      rows.get(slot.startTime)!.push({
        slot,
        section,
      });
    }
  }

  const times = Array.from(allTimes).sort(
    (a, b) => toMinutes(a) - toMinutes(b),
  );

  for (const day of DAYS) {
    for (const entries of dayRows[day].values()) {
      entries.sort((a, b) => {
        const startDifference =
          toMinutes(a.slot.startTime) -
          toMinutes(b.slot.startTime);

        if (startDifference !== 0) {
          return startDifference;
        }

        return a.section.course.code.localeCompare(
          b.section.course.code,
        );
      });
    }
  }

  return {
    times,
    dayRows,
  };
}

function escapeCsvValue(value: unknown): string {
  const stringValue = String(value ?? '');

  return `"${stringValue.replace(/"/g, '""')}"`;
}

export default function AdminTimetablePage() {
  const {
    accessToken,
    isLoading: authLoading,
  } = useAuth();

  const [departments, setDepartments] = useState<
    Department[]
  >([]);

  const [departmentId, setDepartmentId] =
    useState('');

  const [timetable, setTimetable] = useState<
    DeptSection[] | null
  >(null);

  const [result, setResult] =
    useState<GenerateResult | null>(null);

  const [departmentsLoading, setDepartmentsLoading] =
    useState(true);

  const [timetableLoading, setTimetableLoading] =
    useState(false);

  const [isRunning, setIsRunning] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [expanded, setExpanded] =
    useState<string | null>(null);

  const selectedDept = useMemo(
    () =>
      departments.find(
        (department) =>
          department.id === departmentId,
      ) ?? null,
    [departments, departmentId],
  );

  const grid = useMemo(
    () =>
      timetable
        ? createGrid(timetable)
        : null,
    [timetable],
  );

  const placed = useMemo(
    () =>
      timetable?.filter(
        (section) =>
          Array.isArray(section.slots) &&
          section.slots.length > 0,
      ).length ?? 0,
    [timetable],
  );

  const unplaced = useMemo(
    () =>
      timetable
        ? Math.max(timetable.length - placed, 0)
        : 0,
    [timetable, placed],
  );

  const loadDepartments = useCallback(
    async () => {
      if (!accessToken) {
        setDepartmentsLoading(false);
        return;
      }

      try {
        setDepartmentsLoading(true);
        setError(null);

        const data = await apiFetch<
          Department[]
        >('/departments', {
          token: accessToken,
        });

        const safeDepartments = Array.isArray(data)
          ? data
          : [];

        setDepartments(safeDepartments);

        setDepartmentId((currentId) => {
          if (
            currentId &&
            safeDepartments.some(
              (department) =>
                department.id === currentId,
            )
          ) {
            return currentId;
          }

          return safeDepartments[0]?.id ?? '';
        });
      } catch (err) {
        setDepartments([]);

        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load departments.',
        );
      } finally {
        setDepartmentsLoading(false);
      }
    },
    [accessToken],
  );

  const loadTimetable = useCallback(
    async (selectedDepartmentId: string) => {
      if (
        !accessToken ||
        !selectedDepartmentId
      ) {
        setTimetable(null);
        setTimetableLoading(false);
        return;
      }

      try {
        setTimetableLoading(true);
        setError(null);
        setExpanded(null);

        const data = await apiFetch<
          DeptSection[]
        >(
          `/timetable/department/${selectedDepartmentId}`,
          {
            token: accessToken,
          },
        );

        setTimetable(
          Array.isArray(data) ? data : [],
        );
      } catch (err) {
        setTimetable(null);

        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load the department timetable.',
        );
      } finally {
        setTimetableLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!accessToken) {
      setDepartments([]);
      setDepartmentId('');
      setTimetable(null);
      setDepartmentsLoading(false);
      setTimetableLoading(false);
      return;
    }

    void loadDepartments();
  }, [
    authLoading,
    accessToken,
    loadDepartments,
  ]);

  useEffect(() => {
    if (
      authLoading ||
      !accessToken ||
      !departmentId
    ) {
      return;
    }

    void loadTimetable(departmentId);
  }, [
    authLoading,
    accessToken,
    departmentId,
    loadTimetable,
  ]);

  const handleDepartmentChange = (
    value: string,
  ) => {
    setDepartmentId(value);
    setResult(null);
    setError(null);
    setExpanded(null);
  };

  const handleGenerate = async () => {
    if (
      !accessToken ||
      !departmentId ||
      isRunning
    ) {
      return;
    }

    try {
      setIsRunning(true);
      setError(null);
      setResult(null);
      setExpanded(null);

      const generated =
        await apiFetch<GenerateResult>(
          '/timetable/generate',
          {
            token: accessToken,
            method: 'POST',
            body: JSON.stringify({
              departmentId,
            }),
          },
        );

      const safeResult: GenerateResult = {
        placedCount:
          Number.isFinite(
            generated?.placedCount,
          )
            ? generated.placedCount
            : 0,

        unplacedSectionIds:
          Array.isArray(
            generated?.unplacedSectionIds,
          )
            ? generated.unplacedSectionIds
            : [],
      };

      setResult(safeResult);

      await loadTimetable(departmentId);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to generate timetable.',
      );
    } finally {
      setIsRunning(false);
    }
  };

  const exportCsv = () => {
    if (
      !timetable ||
      timetable.length === 0
    ) {
      return;
    }

    const rows: string[][] = [
      [
        'Day',
        'Start Time',
        'End Time',
        'Course Code',
        'Course Title',
        'Teacher',
        'Room',
        'Location',
        'Students',
        'Capacity',
      ],
    ];

    for (const section of timetable) {
      const slots = Array.isArray(
        section.slots,
      )
        ? section.slots
        : [];

      for (const slot of slots) {
        rows.push([
          DAY_LABEL[slot.day] ?? slot.day,
          slot.startTime ?? '',
          slot.endTime ?? '',
          section.course?.code ?? '',
          section.course?.title ?? '',
          section.teacher?.user?.email ?? '',
          slot.room?.label ?? '',
          slot.room?.floor
            ? `${slot.room.floor.block?.name ?? ''} - Floor ${slot.room.floor.floorNumber ?? ''
            }`
            : '',
          String(
            section._count?.enrollments ?? 0,
          ),
          String(section.capacity ?? 0),
        ]);
      }
    }

    if (rows.length <= 1) {
      return;
    }

    const csv = rows
      .map((row) =>
        row.map(escapeCsvValue).join(','),
      )
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    const departmentCode =
      selectedDept?.code
        ?.trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-') ||
      'department';

    anchor.href = url;
    anchor.download = `${departmentCode}-timetable.csv`;
    anchor.style.display = 'none';

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  };

  const toggleExpanded = (slotId: string) => {
    setExpanded((current) =>
      current === slotId
        ? null
        : slotId,
    );
  };

  const isPageLoading =
    authLoading || departmentsLoading;

  if (isPageLoading) {
    return (
      <main className="w-full min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
        <PageHeader
          eyebrow="Scheduling Office"
          title="Timetable Generator"
          subtitle="Generate and review department-wide weekly schedules."
        />

        <AdminSurface className="p-6">
          <div
            className="animate-pulse space-y-4"
            aria-label="Loading timetable generator"
          >
            <div className="h-4 w-40 rounded bg-slate-100" />
            <div className="h-10 w-full rounded-lg bg-slate-100" />
            <div className="h-10 w-32 rounded-lg bg-slate-100" />
          </div>
        </AdminSurface>
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
      <PageHeader
        eyebrow="Scheduling Office"
        title="Timetable Generator"
        subtitle="Generate a department-wide weekly schedule, inspect placement, and export the finished timetable."
      />

      {/* Generator */}
      <AdminSurface className="mb-7 min-w-0 p-5 sm:p-6">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Generate schedule
            </p>

            <h2 className="mt-2 font-serif text-lg font-semibold text-slate-950">
              Build a department timetable
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Generate a schedule using the available
              rooms and time slots. Existing timetable
              entries for the selected department may be
              replaced during generation.
            </p>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={departmentId}
              onChange={(event) =>
                handleDepartmentChange(
                  event.target.value,
                )
              }
              disabled={
                departments.length === 0 ||
                isRunning
              }
              className={`${selectClass} min-w-0 max-w-full`}
              aria-label="Select department"
            >
              <option value="">
                Select department…
              </option>

              {departments.map((department) => (
                <option
                  key={department.id}
                  value={department.id}
                >
                  {department.name} (
                  {department.code})
                </option>
              ))}
            </select>

            <AdminButton
              onClick={handleGenerate}
              disabled={
                !departmentId ||
                isRunning ||
                timetableLoading
              }
              className="min-h-10 sm:min-w-32"
            >
              {isRunning
                ? 'Generating…'
                : 'Generate'}
            </AdminButton>
          </div>
        </div>

        {selectedDept && (
          <div className="mt-5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <span>
              Selected department:
            </span>

            <span className="font-semibold text-slate-800">
              {selectedDept.name}
            </span>

            <span className="text-slate-300">
              •
            </span>

            <span className="font-data text-slate-600">
              {selectedDept.code}
            </span>
          </div>
        )}

        {departments.length === 0 &&
          !departmentsLoading && (
            <div className="mt-4">
              <AdminMessage tone="error">
                No departments are available.
                Create a department first before
                generating a timetable.
              </AdminMessage>
            </div>
          )}

        {error && (
          <div className="mt-4 min-w-0">
            <AdminMessage tone="error">
              {error}
            </AdminMessage>
          </div>
        )}
      </AdminSurface>

      {/* Generation result */}
      {result && (
        <AdminSurface className="mb-7 min-w-0 p-5 sm:p-6">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-serif text-lg font-semibold text-slate-950">
                Generation completed
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {selectedDept?.name ??
                  'Department'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <AdminPill tone="success">
                {result.placedCount} placed
              </AdminPill>

              {result.unplacedSectionIds
                .length > 0 && (
                  <AdminPill tone="danger">
                    {
                      result.unplacedSectionIds
                        .length
                    }{' '}
                    unresolved
                  </AdminPill>
                )}
            </div>
          </div>

          {result.unplacedSectionIds
            .length > 0 && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                Some sections could not be scheduled
                without a conflict. Review available
                rooms and time slots, then generate
                again.
              </div>
            )}

          {result.unplacedSectionIds.length ===
            0 && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                All sections were successfully placed
                into the generated timetable.
              </div>
            )}
        </AdminSurface>
      )}

      {/* Timetable heading */}
      <div className="mb-4 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-slate-950">
            Weekly timetable
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {selectedDept?.code ??
              'Choose a department'}

            {timetable && (
              <>
                {' · '}
                {placed} placed
                {' · '}
                {unplaced} unplaced
              </>
            )}
          </p>
        </div>

        {timetable && (
          <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
            <AdminButton
              variant="secondary"
              onClick={exportCsv}
              disabled={
                !grid ||
                grid.times.length === 0
              }
              className="flex-1 sm:flex-none"
            >
              Download CSV
            </AdminButton>

            <AdminButton
              variant="secondary"
              onClick={() => window.print()}
              disabled={
                !grid ||
                grid.times.length === 0
              }
              className="flex-1 sm:flex-none"
            >
              Print
            </AdminButton>
          </div>
        )}
      </div>

      {/* Loading timetable */}
      {timetableLoading && (
        <AdminSurface className="min-w-0 p-6">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />

            <p className="text-sm text-slate-500">
              Loading the department timetable…
            </p>
          </div>
        </AdminSurface>
      )}

      {/* No department / no timetable */}
      {!timetableLoading &&
        !timetable &&
        !departmentId && (
          <AdminSurface className="min-w-0 p-6">
            <p className="text-sm text-slate-500">
              Choose a department to load its current
              timetable.
            </p>
          </AdminSurface>
        )}

      {!timetableLoading &&
        !timetable &&
        departmentId && (
          <AdminSurface className="min-w-0 p-6">
            <p className="text-sm text-slate-500">
              Unable to load the department timetable.
              Please try selecting the department again.
            </p>
          </AdminSurface>
        )}

      {!timetableLoading &&
        timetable &&
        placed === 0 && (
          <EmptyState
            title="Nothing scheduled yet"
            hint="Run Generate above to place sections into available rooms and time slots."
          />
        )}

      {!timetableLoading &&
        timetable &&
        placed > 0 &&
        grid && (
          <>
            {/* Desktop timetable */}
            <section className="hidden w-full min-w-0 max-w-[calc(100vw-25vw)] lg:block">
              <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div
                  className="w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x [scrollbar-gutter:stable]"
                  style={{
                    WebkitOverflowScrolling:
                      'touch',
                  }}
                >
                  <table className="w-[1100px] min-w-[1100px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/90">
                        <th className="sticky left-0 z-30 w-24 min-w-24 border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Time
                        </th>

                        {DAYS.map((day) => (
                          <th
                            key={day}
                            className="w-[155px] min-w-[155px] whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                          >
                            {DAY_LABEL[day]}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {grid.times.map((time) => (
                        <tr
                          key={time}
                          className="align-top"
                        >
                          <td className="sticky left-0 z-20 w-24 min-w-24 whitespace-nowrap border-r border-slate-200 bg-slate-50 px-4 py-4 font-data text-xs text-slate-500">
                            {formatTime(time)}
                          </td>

                          {DAYS.map((day) => {
                            const entries =
                              grid.dayRows[
                                day
                              ]?.get(time) ?? [];

                            return (
                              <td
                                key={day}
                                className="w-[155px] min-w-[155px] px-3 py-3 align-top"
                              >
                                {entries.length ===
                                  0 ? (
                                  <div className="flex min-h-[90px] items-center justify-center">
                                    <span className="text-xs text-slate-200">
                                      —
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {entries.map(
                                      ({
                                        slot,
                                        section,
                                      }) => {
                                        const open =
                                          expanded ===
                                          slot.id;

                                        const students =
                                          section.enrollments?.map(
                                            (
                                              enrollment,
                                            ) =>
                                              enrollment.student,
                                          ) ?? [];

                                        return (
                                          <div
                                            key={
                                              slot.id
                                            }
                                            className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                                          >
                                            <div className="flex min-w-0 items-start justify-between gap-2">
                                              <div className="min-w-0 flex-1">
                                                <p className="truncate font-data text-xs font-semibold text-slate-950">
                                                  {section
                                                    .course
                                                    .code}
                                                </p>

                                                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                                  {section
                                                    .course
                                                    .title}
                                                </p>
                                              </div>

                                              <span className="max-w-[70px] shrink-0 truncate rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                                                {
                                                  slot
                                                    .room
                                                    .label
                                                }
                                              </span>
                                            </div>

                                            <div className="mt-2 space-y-1 text-[11px] leading-4 text-slate-500">
                                              <p className="truncate">
                                                {slot
                                                  .room
                                                  .type ===
                                                  'LAB'
                                                  ? 'Lab · '
                                                  : ''}

                                                {
                                                  slot
                                                    .room
                                                    .floor
                                                    .block
                                                    .name
                                                }

                                                {' · Floor '}

                                                {
                                                  slot
                                                    .room
                                                    .floor
                                                    .floorNumber
                                                }
                                              </p>

                                              <p className="truncate">
                                                {section
                                                  .teacher
                                                  ?.user
                                                  ?.email ??
                                                  'No teacher assigned'}
                                              </p>

                                              <p className="font-data text-slate-400">
                                                {formatTime(
                                                  slot.startTime,
                                                )}{' '}
                                                –{' '}
                                                {formatTime(
                                                  slot.endTime,
                                                )}
                                              </p>
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                toggleExpanded(
                                                  slot.id,
                                                )
                                              }
                                              aria-expanded={
                                                open
                                              }
                                              className="mt-3 w-full rounded-lg bg-slate-50 px-2.5 py-2 text-left text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                            >
                                              <span className="flex items-center justify-between gap-2">
                                                <span>
                                                  {
                                                    students.length
                                                  }{' '}
                                                  {students.length ===
                                                    1
                                                    ? 'student'
                                                    : 'students'}
                                                </span>

                                                <span className="text-slate-400">
                                                  {open
                                                    ? 'Hide'
                                                    : 'View'}
                                                </span>
                                              </span>
                                            </button>

                                            {open && (
                                              <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2">
                                                {students.length ===
                                                  0 ? (
                                                  <p className="text-[11px] text-slate-400">
                                                    No students
                                                    enrolled.
                                                  </p>
                                                ) : (
                                                  students.map(
                                                    (
                                                      student,
                                                    ) => (
                                                      <p
                                                        key={
                                                          student.id
                                                        }
                                                        className="border-b border-slate-100 py-1 font-data text-[11px] text-slate-600 last:border-0"
                                                      >
                                                        {
                                                          student.enrollmentNo
                                                        }

                                                        <span className="text-slate-400">
                                                          {' '}
                                                          · Sem{' '}
                                                          {
                                                            student.semester
                                                          }
                                                        </span>
                                                      </p>
                                                    ),
                                                  )
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      },
                                    )}
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
              </div>

              <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-slate-400">
                <span>
                  Timetable
                </span>

                <span className="hidden sm:inline">
                  ← Scroll horizontally to view all
                  days →
                </span>
              </div>
            </section>

            {/* Mobile / Tablet timetable */}
            <div className="mt-3 grid w-full min-w-0 grid-cols-1 gap-3 lg:hidden">
              {DAYS.map((day) => {
                const dayEntries =
                  grid.times.flatMap((time) =>
                    (
                      grid.dayRows[day].get(
                        time,
                      ) ?? []
                    ).map((entry) => ({
                      time,
                      ...entry,
                    })),
                  );

                if (dayEntries.length === 0) {
                  return null;
                }

                return (
                  <section
                    key={day}
                    className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {day}
                      </p>

                      <p className="mt-0.5 text-sm font-medium text-slate-800">
                        {DAY_LABEL[day]}
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {dayEntries.map(
                        ({
                          time,
                          slot,
                          section,
                        }) => {
                          const open =
                            expanded ===
                            slot.id;

                          const students =
                            section.enrollments?.map(
                              (enrollment) =>
                                enrollment.student,
                            ) ?? [];

                          return (
                            <div
                              key={slot.id}
                              className="min-w-0 p-4"
                            >
                              <div className="flex min-w-0 items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="font-data text-xs font-semibold text-slate-950">
                                    {
                                      section
                                        .course
                                        .code
                                    }
                                  </p>

                                  <h3 className="mt-1 break-words text-sm font-medium text-slate-800">
                                    {
                                      section
                                        .course
                                        .title
                                    }
                                  </h3>
                                </div>

                                <AdminPill>
                                  {
                                    slot.room
                                      .label
                                  }
                                </AdminPill>
                              </div>

                              <div className="mt-3 grid min-w-0 gap-2 text-xs text-slate-500 sm:grid-cols-2">
                                <span>
                                  {formatTime(
                                    time,
                                  )}
                                  {' – '}
                                  {formatTime(
                                    slot.endTime,
                                  )}
                                </span>

                                <span className="min-w-0 truncate">
                                  {slot.room
                                    .type ===
                                    'LAB'
                                    ? 'Lab · '
                                    : ''}

                                  {
                                    slot.room
                                      .floor
                                      .block
                                      .name
                                  }

                                  {' · Floor '}

                                  {
                                    slot.room
                                      .floor
                                      .floorNumber
                                  }
                                </span>

                                <span className="min-w-0 truncate sm:col-span-2">
                                  {section
                                    .teacher
                                    ?.user
                                    ?.email ??
                                    'No teacher assigned'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleExpanded(
                                    slot.id,
                                  )
                                }
                                aria-expanded={
                                  open
                                }
                                className="mt-4 w-full rounded-lg bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                {students.length}{' '}
                                enrolled

                                <span className="mx-1 text-slate-300">
                                  ·
                                </span>

                                {open
                                  ? 'Hide roster'
                                  : 'View roster'}
                              </button>

                              {open && (
                                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3">
                                  {students.length ===
                                    0 ? (
                                    <p className="text-xs text-slate-400">
                                      No students
                                      enrolled.
                                    </p>
                                  ) : (
                                    students.map(
                                      (
                                        student,
                                      ) => (
                                        <p
                                          key={
                                            student.id
                                          }
                                          className="border-b border-slate-100 py-1.5 font-data text-xs text-slate-600 last:border-0"
                                        >
                                          {
                                            student.enrollmentNo
                                          }

                                          {' · '}

                                          Semester{' '}
                                          {
                                            student.semester
                                          }
                                        </p>
                                      ),
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}

      {/* Roster summary */}
      {!timetableLoading &&
        timetable &&
        timetable.length > 0 && (
          <section className="mt-10 min-w-0">
            <AdminSectionHeading
              title="Section roster summary"
              subtitle={`${timetable.length} sections in the selected department`}
            />

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {timetable.map((section) => {
                const slots = Array.isArray(
                  section.slots,
                )
                  ? section.slots
                  : [];

                const hasSlots =
                  slots.length > 0;

                const enrollmentCount =
                  section._count
                    ?.enrollments ??
                  section.enrollments
                    ?.length ??
                  0;

                return (
                  <AdminSurface
                    key={section.id}
                    className="min-w-0 p-4"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-data text-sm font-semibold text-slate-950">
                          {section.course
                            ?.code ??
                            'Unknown course'}
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {section.course
                            ?.title ??
                            'No course title'}
                        </p>
                      </div>

                      <AdminPill
                        tone={
                          hasSlots
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {hasSlots
                          ? `${slots.length} ${slots.length ===
                            1
                            ? 'slot'
                            : 'slots'
                          }`
                          : 'Unplaced'}
                      </AdminPill>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
                      <div>
                        <p className="text-slate-400">
                          Term
                        </p>

                        <p className="mt-1 font-medium text-slate-700">
                          {section.term ||
                            '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">
                          Credits
                        </p>

                        <p className="mt-1 font-medium text-slate-700">
                          {section.course
                            ?.creditHours ??
                            0}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">
                          Capacity
                        </p>

                        <p className="mt-1 font-medium text-slate-700">
                          {section.capacity ??
                            0}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">
                          Enrolled
                        </p>

                        <p className="mt-1 font-medium text-slate-700">
                          {enrollmentCount}
                        </p>
                      </div>
                    </div>
                  </AdminSurface>
                );
              })}
            </div>
          </section>
        )}
    </main>
  );
}