'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';
import { percentageToGradeLabel } from '@/lib/grade-scale';

interface MySection {
  id: string;
  courseId: string;
  course: { title: string; code: string };
  enrolledCount: number;
}
interface GradeSheetRow {
  student: { id: string; enrollmentNo: string; email: string };
  entries: { component: string; marks: number; maxMarks: number }[];
}
interface GradeSheet {
  sectionId: string;
  courseId: string;
  course: { code: string; title: string };
  rows: GradeSheetRow[];
}

const DEFAULT_COMPONENTS = [
  { key: 'quiz1', label: 'Quiz 1', max: 10 },
  { key: 'quiz2', label: 'Quiz 2', max: 10 },
  { key: 'assignment1', label: 'Assignment', max: 20 },
  { key: 'midterm', label: 'Midterm', max: 30 },
  { key: 'final', label: 'Final', max: 30 },
];

type CellMap = Record<string, Record<string, { marks: string; maxMarks: string }>>;

export default function TeacherGradesPage() {
  const { accessToken, profile } = useAuth();
  const [mySections, setMySections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [sheet, setSheet] = useState<GradeSheet | null>(null);
  const [cells, setCells] = useState<CellMap>({});
  const [components, setComponents] = useState(DEFAULT_COMPONENTS);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !profile?.teacherId) return;
    apiFetch<MySection[]>(`/teachers/${profile.teacherId}/sections`, { token: accessToken })
      .then((sections) => {
        setMySections(sections);
        if (sections.length > 0) setSectionId(sections[0]?.id ?? '');
      })
      .catch(() => {});
  }, [accessToken, profile]);

  const loadSheet = useCallback(
    async (id: string) => {
      if (!id || !accessToken) return;
      setError(null);
      setStatus(null);
      try {
        const data = await apiFetch<GradeSheet>(`/grades/section/${id}`, { token: accessToken });
        setSheet(data);

        // component columns = known defaults merged with any extra components already saved
        const seen = new Map<string, { key: string; label: string; max: number }>();
        DEFAULT_COMPONENTS.forEach((c) => seen.set(c.key, { key: c.key, label: c.label, max: c.max }));
        data.rows.forEach((r) =>
          r.entries.forEach((e) => {
            if (!seen.has(e.component)) seen.set(e.component, { key: e.component, label: e.component, max: e.maxMarks });
          }),
        );
        const cols = DEFAULT_COMPONENTS.map((c) => seen.get(c.key) ?? { key: c.key, label: c.label, max: c.max });
        for (const [, v] of seen) if (!cols.find((c) => c.key === v.key)) cols.push(v);
        setComponents(cols);

        const next: CellMap = {};
        data.rows.forEach((r) => {
          next[r.student.id] = {};
          cols.forEach((c) => {
            const existing = r.entries.find((e) => e.component === c.key);
            next[r.student.id]![c.key] = {
              marks: existing ? String(existing.marks) : '',
              maxMarks: existing ? String(existing.maxMarks) : String(c.max),
            };
          });
        });
        setCells(next);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load grade sheet');
      }
    },
    [accessToken],
  );

  useEffect(() => {
    loadSheet(sectionId);
  }, [sectionId, loadSheet]);

  const currentCourse = mySections.find((s) => s.id === sectionId);

  const setCell = (studentId: string, component: string, field: 'marks' | 'maxMarks', value: string) =>
    setCells((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] ?? {}), [component]: { ...(prev[studentId]?.[component] ?? { marks: '', maxMarks: '' }), [field]: value } } }));

  const rowTotal = useCallback(
    (studentId: string) => {
      const row = cells[studentId];
      if (!row) return { marks: 0, max: 0, pct: null };
      let marks = 0;
      let max = 0;
      components.forEach((c) => {
        const cell = row[c.key];
        const m = Number(cell?.marks);
        const mx = Number(cell?.maxMarks);
        if (cell?.marks !== '' && Number.isFinite(m)) marks += m;
        if (cell?.maxMarks !== '' && Number.isFinite(mx) && mx > 0) max += mx;
      });
      const pct = max > 0 ? (marks / max) * 100 : null;
      return { marks, max, pct };
    },
    [cells, components],
  );

  async function handleSave() {
    if (!sheet || !currentCourse) return;
    setError(null);
    setStatus(null);
    setSaving(true);
    try {
      const pending: { studentId: string; component: string; marks: number; maxMarks: number }[] = [];
      sheet.rows.forEach((r) =>
        components.forEach((c) => {
          const cell = cells[r.student.id]?.[c.key];
          const marks = Number(cell?.marks);
          const maxMarks = Number(cell?.maxMarks);
          if (cell?.marks === '' || !Number.isFinite(marks) || !Number.isFinite(maxMarks)) return;
          if (marks < 0 || maxMarks <= 0) return;
          const existing = r.entries.find((e) => e.component === c.key);
          if (existing && existing.marks === marks && existing.maxMarks === maxMarks) return;
          pending.push({ studentId: r.student.id, component: c.key, marks, maxMarks });
        }),
      );

      if (pending.length === 0) {
        setStatus('No changes to save — every cell already matches what is stored.');
        return;
      }

      // sequential saves; upsert handles repeat keys idempotently
      let marked = 0;
      for (const entry of pending) {
        await apiFetch('/grades', {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({ ...entry, courseId: currentCourse.courseId }),
        });
        marked++;
      }
      setStatus(`Saved ${marked} grade${marked === 1 ? '' : 's'} for ${currentCourse.course.code} — students see updates on their Results page and transcript.`);
      await loadSheet(sectionId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Faculty"
        title="Enter Grades"
        subtitle="A live grade sheet for the section — type marks into the grid and save. Re-entering a cell updates it in place, never duplicates."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sections</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{mySections.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Current course</p>
          <p className="font-data text-sm font-semibold text-slate-900">{currentCourse?.course.code ?? '—'}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Students in sheet</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{sheet?.rows.length ?? '—'}</p>
        </div>
      </div>

      <div className="mb-6 flex max-w-xl items-center gap-2">
        <label className="block flex-1">
          <span className="mb-1 block text-sm font-medium text-slate-700">Section</span>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {mySections.length === 0 && <option value="">No sections assigned</option>}
            {mySections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.course.title} ({s.course.code}) · {s.enrolledCount} students
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={handleSave}
          disabled={saving || !sheet}
          className="mt-5 rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save Sheet'}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {status && <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{status}</p>}

      {!sheet ? (
        sectionId && <p className="text-sm text-slate-500" data-testid="loading-sheet">Loading grade sheet...</p>
      ) : sheet.rows.length === 0 ? (
        <div className="max-w-xl">
          <EmptyState
            title="No students in this section"
            hint="The sheet populates automatically once students enroll."
          />
        </div>
      ) : (
        <>
          <p className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <Ribbon tone="navy">{sheet.course.code} · {sheet.rows.length} students</Ribbon>
            <span className="text-xs text-slate-400">Max marks are editable per cell — set the out-of value on the right of each box.</span>
          </p>
          <div className="scroll-area overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-medium">Student</th>
                  {components.map((c) => (
                    <th key={c.key} className="px-2 py-3 text-center font-medium">{c.label}</th>
                  ))}
                  <th className="px-4 py-3 text-center font-medium">Total %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sheet.rows.map((r) => {
                  const tot = rowTotal(r.student.id);
                  const label = tot.pct === null ? null : percentageToGradeLabel(tot.pct);
                  return (
                    <tr key={r.student.id} className="bg-white">
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5">
                        <span className="block font-data text-xs text-slate-500">{r.student.enrollmentNo}</span>
                        <span className="block truncate text-xs text-slate-400">{r.student.email}</span>
                      </td>
                      {components.map((c) => {
                        const cell = cells[r.student.id]?.[c.key] ?? { marks: '', maxMarks: '' };
                        return (
                          <td key={c.key} className="px-2 py-2 text-center">
                            <div className="inline-flex items-center overflow-hidden rounded-md border border-slate-200 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900">
                              <input
                                value={cell.marks}
                                onChange={(e) => setCell(r.student.id, c.key, 'marks', e.target.value)}
                                placeholder="–"
                                type="number"
                                aria-label={`${r.student.enrollmentNo} ${c.label} marks`}
                                className="w-14 border-r border-slate-200 bg-transparent px-2 py-1.5 text-center font-data text-xs outline-none"
                              />
                              <input
                                value={cell.maxMarks}
                                onChange={(e) => setCell(r.student.id, c.key, 'maxMarks', e.target.value)}
                                aria-label={`${r.student.enrollmentNo} ${c.label} max marks`}
                                type="number"
                                className="w-12 bg-slate-50 px-1 py-1.5 text-center font-data text-[11px] outline-none"
                              />
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-center">
                        {tot.pct === null ? (
                          <span className="text-xs text-slate-300">—</span>
                        ) : (
                          <span className="text-sm font-medium text-slate-900">
                            {tot.pct.toFixed(1)}%
                            {label && <span className="ml-1 text-xs text-slate-400">{label}</span>}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}