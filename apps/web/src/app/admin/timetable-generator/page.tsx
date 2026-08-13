'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface GenerateResult {
  placedCount: number;
  unplacedSectionIds: string[];
}
interface Department {
  id: string;
  name: string;
  code: string;
}
interface DeptSlot {
  id: string;
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  startTime: string;
  endTime: string;
  room: { id: string; label: string; type: string; floor: { floorNumber: number; block: { name: string } } };
}
interface DeptSection {
  id: string;
  term: string;
  capacity: number;
  course: { code: string; title: string; creditHours: number };
  teacher: { user: { email: string } };
  _count: { enrollments: number };
  enrollments: { student: { id: string; enrollmentNo: string; semester: number } }[];
  slots: DeptSlot[];
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

function toMinutes(t?: string) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export default function TimetableGeneratorPage() {
  const { accessToken } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [timetable, setTimetable] = useState<DeptSection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<Department[]>('/departments', { token: accessToken }).then(setDepartments).catch(() => {});
  }, [accessToken]);

  const loadTimetable = useCallback(
    async (id: string) => {
      if (!id || !accessToken) return;
      setError(null);
      try {
        const data = await apiFetch<DeptSection[]>(`/timetable/department/${id}`, { token: accessToken });
        setTimetable(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load timetable');
      }
    },
    [accessToken],
  );

  useEffect(() => {
    loadTimetable(departmentId);
  }, [departmentId, loadTimetable]);

  async function handleGenerate() {
    setError(null);
    setResult(null);
    setIsRunning(true);
    try {
      const data = await apiFetch<GenerateResult>(`/timetable/generate?departmentId=${departmentId}`, {
        method: 'POST',
        token: accessToken,
      });
      setResult(data);
      await loadTimetable(departmentId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Generation failed');
    } finally {
      setIsRunning(false);
    }
  }

  const selectedDept = departments.find((d) => d.id === departmentId);

  // The per-day / per-time grid is derived entirely from the sections' slots.
  const grid = useMemo(() => {
    if (!timetable) return null;
    const dayRows: Record<string, Map<string, { slot: DeptSlot; section: DeptSection }[]>> = {};
    const allTimes = new Set<string>();
    for (const section of timetable) {
      for (const slot of section.slots) {
        const map = dayRows[slot.day] ?? (dayRows[slot.day] = new Map());
        const list = map.get(slot.startTime) ?? [];
        list.push({ slot, section });
        map.set(slot.startTime, list);
        allTimes.add(slot.startTime);
      }
    }
    const times = [...allTimes].sort((a, b) => toMinutes(a) - toMinutes(b));
    return { dayRows, times };
  }, [timetable]);

    const placed = timetable?.filter((s) => s.slots.length > 0).length ?? 0;

  function exportCsv() {
    if (!grid || !selectedDept) return;
    const rows: string[][] = [];
    rows.push(['Weekly Timetable — ' + selectedDept.name].map((v) => `"${v}"`));
    rows.push(['Generated', new Date().toLocaleString()].map((v) => `"${v}"`));
    rows.push([]);
    rows.push(['Time', ...DAYS.map((d) => `"${d}"`)]);
    for (const time of grid.times) {
      const cells: string[] = [`"${time}"`];
      for (const day of DAYS) {
        const entries = grid.dayRows[day]?.get(time) ?? [];
        const cell = entries
          .map(({ slot, section }) => `${section.course.code} (${slot.room.label})`)
          .join(' | ');
        cells.push(`"${cell.replace(/"/g, '""')}"`);
      }
      rows.push(cells);
    }
    rows.push([]);
    rows.push(['Sections placed', String(placed)].map((v) => `"${v}"`));
    rows.push(['Sections unplaced', String(timetable ? timetable.length - placed : 0)].map((v) => `"${v}"`));
    const blob = new Blob([rows.map((r) => r.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDept.code}-timetable.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Scheduling Office"
        title="Timetable Generator"
        subtitle="Automatically place every section of a department across a full Mon–Sat week of rooms and times — then inspect, download as CSV, or print the finished timetable: room, teacher, section and roster."
      />

      <div className="ledger-card mb-8 max-w-xl space-y-3 p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Department</span>
          <div className="flex gap-2">
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={isRunning || !departmentId}
              className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
            >
              {isRunning ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </label>
        <p className="text-xs text-slate-400">
          {selectedDept
            ? `Picks every one of ${selectedDept.name}'s sections for the current catalog. Running again replaces the department's timetable in place.`
            : 'Pick a department — its existing weekly timetable (if any) appears below, and Generate overwrites it in place.'}
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {result && (
        <div className="max-w-xl">
          <p className="mb-3 font-serif text-base font-semibold text-slate-900">Generation result — {selectedDept?.code}</p>
          <div className="mb-4 flex gap-2">
            <Ribbon tone={result.unplacedSectionIds.length === 0 ? 'emerald' : 'gold'}>
              {result.placedCount} placed
            </Ribbon>
            {result.unplacedSectionIds.length > 0 && <Ribbon tone="crimson">{result.unplacedSectionIds.length} unresolved</Ribbon>}
          </div>
          {result.unplacedSectionIds.length > 0 && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50/50 p-5 text-sm text-red-700">
              {result.unplacedSectionIds.length} sections could not be scheduled without a clash — free up a room/time window and run again.
            </div>
          )}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <h2 className="font-serif text-lg font-semibold text-slate-900">Weekly Timetable — {selectedDept?.code ?? 'pick a department'}</h2>
        {timetable && (
          <>
            <Ribbon tone="navy">{placed} sections placed</Ribbon>
            <Ribbon tone={timetable.length - placed > 0 ? 'gold' : 'muted'}>{timetable.length - placed} unplaced</Ribbon>
            <span className="mx-1 hidden h-4 w-px bg-slate-200 sm:block" />
            <button
              onClick={exportCsv}
              disabled={!grid || grid.times.length === 0}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              Download CSV
            </button>
            <button
              onClick={() => window.print()}
              disabled={!grid || grid.times.length === 0}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              Print
            </button>
          </>
        )}
      </div>

      {!timetable ? (
        <p className="text-sm text-slate-500">Choose a department to load its timetable.</p>
      ) : placed === 0 ? (
        <div className="max-w-xl">
          <EmptyState
            title="Nothing scheduled yet"
            hint="Run Generate above — every section that fits gets a room + time, and the finished weekly grid shows up here with full room, teacher and roster details."
          />
        </div>
      ) : grid ? (
        <div className="scroll-area overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-24 px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Time</th>
                {DAYS.map((d) => (
                  <th key={d} className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grid.times.map((time) => (
                <tr key={time} className="align-top">
                  <td className="whitespace-nowrap bg-slate-50 px-3 py-3 font-data text-xs text-slate-500">
                    {time}
                  </td>
                  {DAYS.map((day) => {
                    const entries = grid.dayRows[day]?.get(time) ?? [];
                    return (
                      <td key={day} className="px-3 py-3">
                        {entries.length === 0 ? (
                          <span className="text-xs text-slate-200">·</span>
                        ) : (
                          <div className="space-y-2">
                            {entries.map(({ slot, section }) => {
                              const key = slot.id;
                              const open = expanded === key;
                              const students = section.enrollments.map((e) => e.student);
                              return (
                                <div key={slot.id} className="rounded-md border border-slate-200 bg-white p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate font-data text-xs font-semibold text-slate-900">{section.course.code}</p>
                                      <p className="truncate text-[11px] text-slate-500">{section.course.title}</p>
                                    </div>
                                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                      {slot.room.label}
                                    </span>
                                  </div>
                                  <p className="mt-2 truncate text-[11px] text-slate-500">
                                    {slot.room.type === 'LAB' ? 'Lab · ' : ''}{slot.room.floor.block.name}-{slot.room.floor.floorNumber} · {section.teacher.user.email}
                                  </p>
                                  <button
                                    onClick={() => setExpanded(open ? null : key)}
                                    className="mt-2 text-[11px] font-medium text-blue-600 underline"
                                  >
                                    {students.length} student{students.length === 1 ? '' : 's'}
                                    {open ? ' ▲' : ' ▼'}
                                  </button>
                                  {open && (
                                    <div className="scroll-area mt-2 max-h-40 space-y-0.5 overflow-y-auto rounded bg-slate-50 p-2">
                                      {students.length === 0 ? (
                                        <p className="text-[11px] text-slate-400">No students enrolled yet.</p>
                                      ) : (
                                        students.map((st) => (
                                          <p key={st.id} className="font-data text-[11px] text-slate-600">
                                            {st.enrollmentNo} — Sem {st.semester}
                                          </p>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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
      ) : null}

      {timetable && timetable.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 font-serif text-base font-semibold text-slate-900">Section roster summary</h3>
          <div className="scroll-area grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {timetable.map((s) => (
              <div key={s.id} className="ledger-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-data text-sm font-semibold text-slate-900">{s.course.code}</p>
                  <Ribbon tone={s.slots.length > 0 ? 'emerald' : 'gold'}>{s.slots.length > 0 ? `${s.slots.length} slot${s.slots.length === 1 ? '' : 's'}` : 'unplaced'}</Ribbon>
                </div>
                <p className="text-xs text-slate-500">{s.course.title}</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  {s.term} · capacity {s.capacity} · {s._count.enrollments} enrolled
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}