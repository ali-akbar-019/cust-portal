'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';
import { percentageToGradeLabel } from '@/lib/grade-scale';

interface MySection {
  id: string;
  courseId: string;
  course: {
    title: string;
    code: string;
  };
  enrolledCount: number;
}

interface GradeSheetRow {
  student: {
    id: string;
    enrollmentNo: string;
    email: string;
  };
  entries: {
    component: string;
    marks: number;
    maxMarks: number;
  }[];
}

interface GradeSheet {
  sectionId: string;
  courseId: string;
  course: {
    code: string;
    title: string;
  };
  rows: GradeSheetRow[];
}

const DEFAULT_COMPONENTS = [
  { key: 'quiz1', label: 'Quiz 1', max: 10 },
  { key: 'quiz2', label: 'Quiz 2', max: 10 },
  { key: 'assignment1', label: 'Assignment', max: 20 },
  { key: 'midterm', label: 'Midterm', max: 30 },
  { key: 'final', label: 'Final', max: 30 },
];

type Component = {
  key: string;
  label: string;
  max: number;
};

type CellMap = Record<
  string,
  Record<
    string,
    {
      marks: string;
      maxMarks: string;
    }
  >
>;

function cellIssue(
  marks: string,
  maxMarks: string
): string | null {
  if (marks === '' && maxMarks === '') return null;

  const m = Number(marks);
  const mx = Number(maxMarks);

  if (marks !== '' && !Number.isFinite(m)) {
    return 'Enter a valid number';
  }

  if (maxMarks !== '' && !Number.isFinite(mx)) {
    return 'Max must be a number';
  }

  if (marks !== '' && m < 0) {
    return "Marks can't be negative";
  }

  if (maxMarks !== '' && mx <= 0) {
    return 'Max marks must be greater than 0';
  }

  if (
    marks !== '' &&
    maxMarks !== '' &&
    m > mx
  ) {
    return "Marks can't exceed the max";
  }

  return null;
}

export default function TeacherGradesPage() {
  const { accessToken, profile } = useAuth();

  const [mySections, setMySections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [sheet, setSheet] = useState<GradeSheet | null>(null);
  const [cells, setCells] = useState<CellMap>({});
  const [components, setComponents] =
    useState<Component[]>(DEFAULT_COMPONENTS);

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /*
   * Load teacher sections.
   */
  useEffect(() => {
    if (!accessToken || !profile?.teacherId) {
      return;
    }

    apiFetch<MySection[]>(
      `/teachers/${profile.teacherId}/sections`,
      { token: accessToken }
    )
      .then((sections) => {
        setMySections(sections);

        if (sections.length > 0) {
          setSectionId(sections[0]?.id ?? '');
        } else {
          setSectionId('');
        }
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load your sections'
        );
      });
  }, [accessToken, profile?.teacherId]);

  /*
   * Load grade sheet.
   */
  const loadSheet = useCallback(
    async (id: string) => {
      if (!id || !accessToken) {
        setSheet(null);
        setCells({});
        return;
      }

      setError(null);
      setStatus(null);

      try {
        const data = await apiFetch<GradeSheet>(
          `/grades/section/${id}`,
          { token: accessToken }
        );

        setSheet(data);

        /*
         * Merge default components with any custom
         * components already stored in the database.
         */
        const seen = new Map<string, Component>();

        DEFAULT_COMPONENTS.forEach((component) => {
          seen.set(component.key, {
            key: component.key,
            label: component.label,
            max: component.max,
          });
        });

        data.rows.forEach((row) => {
          row.entries.forEach((entry) => {
            if (!seen.has(entry.component)) {
              seen.set(entry.component, {
                key: entry.component,
                label: entry.component,
                max: entry.maxMarks,
              });
            }
          });
        });

        const columns: Component[] =
          DEFAULT_COMPONENTS.map(
            (component) =>
              seen.get(component.key) ?? {
                key: component.key,
                label: component.label,
                max: component.max,
              }
          );

        for (const [, component] of seen) {
          if (
            !columns.some(
              (column) => column.key === component.key
            )
          ) {
            columns.push(component);
          }
        }

        setComponents(columns);

        /*
         * Build editable cell state.
         */
        const next: CellMap = {};

        data.rows.forEach((row) => {
          next[row.student.id] = {};

          columns.forEach((component) => {
            const existing = row.entries.find(
              (entry) =>
                entry.component === component.key
            );

            next[row.student.id]![component.key] = {
              marks: existing
                ? String(existing.marks)
                : '',
              maxMarks: existing
                ? String(existing.maxMarks)
                : String(component.max),
            };
          });
        });

        setCells(next);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load grade sheet'
        );
        setSheet(null);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    loadSheet(sectionId);
  }, [sectionId, loadSheet]);

  const currentCourse = mySections.find(
    (section) => section.id === sectionId
  );

  /*
   * Update one grade cell.
   */
  const setCell = (
    studentId: string,
    component: string,
    field: 'marks' | 'maxMarks',
    value: string
  ) => {
    setCells((previous) => ({
      ...previous,
      [studentId]: {
        ...(previous[studentId] ?? {}),
        [component]: {
          ...(previous[studentId]?.[component] ?? {
            marks: '',
            maxMarks: '',
          }),
          [field]: value,
        },
      },
    }));
  };

  /*
   * Calculate row totals.
   */
  const rowTotal = useCallback(
    (studentId: string) => {
      const row = cells[studentId];

      if (!row) {
        return {
          marks: 0,
          max: 0,
          pct: null as number | null,
        };
      }

      let marks = 0;
      let max = 0;

      components.forEach((component) => {
        const cell = row[component.key];

        if (
          cell &&
          cellIssue(cell.marks, cell.maxMarks)
        ) {
          return;
        }

        const m = Number(cell?.marks);
        const mx = Number(cell?.maxMarks);

        if (
          cell?.marks !== '' &&
          Number.isFinite(m)
        ) {
          marks += m;
        }

        if (
          cell?.maxMarks !== '' &&
          Number.isFinite(mx) &&
          mx > 0
        ) {
          max += mx;
        }
      });

      const pct =
        max > 0 ? (marks / max) * 100 : null;

      return {
        marks,
        max,
        pct,
      };
    },
    [cells, components]
  );

  /*
   * Find invalid cells.
   */
  const invalidCells = useMemo(() => {
    const entries: {
      studentId: string;
      component: string;
      issue: string;
    }[] = [];

    sheet?.rows.forEach((row) => {
      components.forEach((component) => {
        const cell =
          cells[row.student.id]?.[component.key];

        if (!cell) return;

        const issue = cellIssue(
          cell.marks,
          cell.maxMarks
        );

        if (issue) {
          entries.push({
            studentId: row.student.id,
            component: component.key,
            issue,
          });
        }
      });
    });

    return entries;
  }, [cells, components, sheet]);

  /*
   * Save grades.
   */
  async function handleSave() {
    if (!sheet || !currentCourse || !accessToken) {
      return;
    }

    setError(null);
    setStatus(null);

    if (invalidCells.length > 0) {
      const first = invalidCells[0]!;

      setError(
        `Can't save yet — ${invalidCells.length} invalid cell${invalidCells.length === 1 ? '' : 's'
        }: ${first.issue} (${first.studentId.slice(
          0,
          8
        )} · ${first.component}). Fix them and save again.`
      );

      return;
    }

    setSaving(true);

    try {
      const pending: {
        studentId: string;
        component: string;
        marks: number;
        maxMarks: number;
      }[] = [];

      sheet.rows.forEach((row) => {
        components.forEach((component) => {
          const cell =
            cells[row.student.id]?.[component.key];

          const marks = Number(cell?.marks);
          const maxMarks = Number(cell?.maxMarks);

          if (
            cell?.marks === '' ||
            !Number.isFinite(marks) ||
            !Number.isFinite(maxMarks)
          ) {
            return;
          }

          if (marks < 0 || maxMarks <= 0) {
            return;
          }

          const existing = row.entries.find(
            (entry) =>
              entry.component === component.key
          );

          if (
            existing &&
            existing.marks === marks &&
            existing.maxMarks === maxMarks
          ) {
            return;
          }

          pending.push({
            studentId: row.student.id,
            component: component.key,
            marks,
            maxMarks,
          });
        });
      });

      if (pending.length === 0) {
        setStatus(
          'No changes to save — every cell already matches what is stored.'
        );

        return;
      }

      let marked = 0;

      for (const entry of pending) {
        await apiFetch('/grades', {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({
            ...entry,
            courseId: currentCourse.courseId,
          }),
        });

        marked++;
      }

      setStatus(
        `Saved ${marked} grade${marked === 1 ? '' : 's'
        } for ${currentCourse.course.code} — students see updates on their Results page and transcript.`
      );

      await loadSheet(sectionId);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to save grades'
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Reusable grade editor.
   *
   * This keeps the mobile and desktop versions
   * visually consistent.
   */
  const renderGradeEditor = (
    studentId: string,
    enrollmentNo: string,
    component: Component
  ) => {
    const cell =
      cells[studentId]?.[component.key] ?? {
        marks: '',
        maxMarks: '',
      };

    const issue = cellIssue(
      cell.marks,
      cell.maxMarks
    );

    return (
      <div className="w-full min-w-0">
        <div
          className={`grid grid-cols-2 overflow-hidden rounded-lg border ${issue
            ? 'border-red-400 bg-red-50'
            : 'border-slate-200 bg-white'
            }`}
        >
          <div className="min-w-0 border-r border-slate-200">
            <label className="block px-2 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Marks
            </label>

            <input
              value={cell.marks}
              onChange={(event) =>
                setCell(
                  studentId,
                  component.key,
                  'marks',
                  event.target.value
                )
              }
              placeholder="—"
              type="number"
              inputMode="decimal"
              aria-label={`${enrollmentNo} ${component.label} marks`}
              className={`block w-full min-w-0 border-0 bg-transparent px-2 pb-2 pt-0 text-center font-data text-sm outline-none focus:ring-0 ${issue ? 'text-red-700' : 'text-slate-900'
                }`}
            />
          </div>

          <div className="min-w-0 bg-slate-50">
            <label className="block px-2 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Out of
            </label>

            <input
              value={cell.maxMarks}
              onChange={(event) =>
                setCell(
                  studentId,
                  component.key,
                  'maxMarks',
                  event.target.value
                )
              }
              aria-label={`${enrollmentNo} ${component.label} max marks`}
              type="number"
              inputMode="decimal"
              min={1}
              className={`block w-full min-w-0 border-0 bg-transparent px-2 pb-2 pt-0 text-center font-data text-sm outline-none focus:ring-0 ${issue
                ? 'text-red-700'
                : 'text-slate-700'
                }`}
            />
          </div>
        </div>

        {issue && (
          <p className="mt-1 break-words text-[10px] leading-tight text-red-600">
            {issue}
          </p>
        )}
      </div>
    );
  };

  return (
    <main className="min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
      <PageHeader
        eyebrow="Faculty"
        title="Enter Grades"
        subtitle="A live grade sheet for the section — type marks into the grid and save. Re-entering a cell updates it in place, never duplicates."
      />

      {/* Summary cards */}
      <div className="mb-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="ledger-card min-w-0 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Sections
          </p>

          <p className="font-serif text-2xl font-semibold text-slate-900">
            {mySections.length}
          </p>
        </div>

        <div className="ledger-card min-w-0 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Current course
          </p>

          <p className="truncate font-data text-sm font-semibold text-slate-900">
            {currentCourse?.course.code ?? '—'}
          </p>
        </div>

        <div className="ledger-card min-w-0 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Students in sheet
          </p>

          <p className="font-serif text-2xl font-semibold text-slate-900">
            {sheet?.rows.length ?? '—'}
          </p>
        </div>
      </div>

      {/* Section + save controls */}
      <div className="mb-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="block min-w-0">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Section
          </span>

          <select
            value={sectionId}
            onChange={(event) =>
              setSectionId(event.target.value)
            }
            className="block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          >
            {mySections.length === 0 && (
              <option value="">
                No sections assigned
              </option>
            )}

            {mySections.map((section) => (
              <option
                key={section.id}
                value={section.id}
              >
                {section.course.title} (
                {section.course.code}) ·{' '}
                {section.enrolledCount} students
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={
            saving ||
            !sheet ||
            invalidCells.length > 0
          }
          title={
            invalidCells.length > 0
              ? 'Fix the invalid cells before saving'
              : undefined
          }
          className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {saving
            ? 'Saving...'
            : invalidCells.length > 0
              ? `${invalidCells.length} invalid`
              : 'Save Sheet'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {status && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          {status}
        </div>
      )}

      {invalidCells.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-relaxed text-red-700">
          {invalidCells.length} cell
          {invalidCells.length === 1 ? '' : 's'} need
          attention before saving — marks can't be
          negative, max marks must be above 0, and
          marks can't exceed the max.
        </div>
      )}

      {!sheet ? (
        sectionId ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">
              Loading grade sheet...
            </p>
          </div>
        ) : null
      ) : sheet.rows.length === 0 ? (
        <div className="max-w-xl">
          <EmptyState
            title="No students in this section"
            hint="The sheet populates automatically once students enroll."
          />
        </div>
      ) : (
        <>
          {/* Sheet heading */}
          <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Ribbon tone="navy">
                {sheet.course.code} ·{' '}
                {sheet.rows.length} students
              </Ribbon>

              <span className="text-xs leading-relaxed text-slate-400">
                Enter marks and the maximum marks for
                each component.
              </span>
            </div>
          </div>

          {/* ============================================================
              DESKTOP / TABLET
              ============================================================ */}
          <div className="hidden max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="sticky left-0 z-20 w-[220px] min-w-[220px] border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    {components.map((component) => (
                      <th
                        key={component.key}
                        className="w-[150px] min-w-[150px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        <span className="block truncate">
                          {component.label}
                        </span>

                        <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-slate-400">
                          Default {component.max}
                        </span>
                      </th>
                    ))}

                    <th className="w-[120px] min-w-[120px] border-l border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sheet.rows.map((row) => {
                    const total = rowTotal(
                      row.student.id
                    );

                    const gradeLabel =
                      total.pct === null
                        ? null
                        : percentageToGradeLabel(
                          total.pct
                        );

                    return (
                      <tr
                        key={row.student.id}
                        className="group hover:bg-slate-50/70"
                      >
                        {/* Student */}
                        <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-4 py-3 group-hover:bg-slate-50">
                          <div className="min-w-0">
                            <p className="truncate font-data text-xs font-semibold text-slate-800">
                              {row.student.enrollmentNo}
                            </p>

                            <p className="mt-0.5 max-w-[190px] truncate text-xs text-slate-400">
                              {row.student.email}
                            </p>
                          </div>
                        </td>

                        {/* Components */}
                        {components.map((component) => (
                          <td
                            key={component.key}
                            className="px-2 py-2.5 align-top"
                          >
                            {renderGradeEditor(
                              row.student.id,
                              row.student.enrollmentNo,
                              component
                            )}
                          </td>
                        ))}

                        {/* Total */}
                        <td className="border-l border-slate-100 px-3 py-3 text-center">
                          {total.pct === null ? (
                            <span className="text-sm text-slate-300">
                              —
                            </span>
                          ) : (
                            <div>
                              <p className="font-data text-sm font-semibold text-slate-900">
                                {total.pct.toFixed(1)}%
                              </p>

                              {gradeLabel && (
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {gradeLabel}
                                </p>
                              )}

                              <p className="mt-1 text-[10px] text-slate-400">
                                {total.marks} /{' '}
                                {total.max}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================================
              MOBILE
              Each student becomes a card.
              This completely eliminates horizontal overflow.
              ============================================================ */}
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:hidden">
            {sheet.rows.map((row, index) => {
              const total = rowTotal(
                row.student.id
              );

              const gradeLabel =
                total.pct === null
                  ? null
                  : percentageToGradeLabel(
                    total.pct
                  );

              return (
                <article
                  key={row.student.id}
                  className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* Student header */}
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                          Student {index + 1}
                        </p>

                        <p className="mt-0.5 truncate font-data text-sm font-semibold text-slate-900">
                          {row.student.enrollmentNo}
                        </p>

                        <p className="mt-0.5 break-all text-xs text-slate-400">
                          {row.student.email}
                        </p>
                      </div>

                      {/* Total */}
                      <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-right shadow-sm">
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                          Total
                        </p>

                        {total.pct === null ? (
                          <p className="font-data text-sm text-slate-300">
                            —
                          </p>
                        ) : (
                          <>
                            <p className="font-data text-sm font-semibold text-slate-900">
                              {total.pct.toFixed(1)}%
                            </p>

                            {gradeLabel && (
                              <p className="text-[10px] text-slate-400">
                                {gradeLabel}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grade components */}
                  <div className="grid min-w-0 grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                    {components.map((component) => (
                      <div
                        key={component.key}
                        className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 p-3"
                      >
                        <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-slate-700">
                            {component.label}
                          </p>

                          <span className="shrink-0 text-[10px] text-slate-400">
                            default {component.max}
                          </span>
                        </div>

                        {renderGradeEditor(
                          row.student.id,
                          row.student.enrollmentNo,
                          component
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Total footer */}
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Current total
                      </p>

                      <p className="text-[11px] text-slate-400">
                        {total.marks} / {total.max}{' '}
                        marks
                      </p>
                    </div>

                    <div className="text-right">
                      {total.pct === null ? (
                        <span className="text-sm text-slate-300">
                          Not calculated
                        </span>
                      ) : (
                        <span className="font-data text-sm font-semibold text-slate-900">
                          {total.pct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}