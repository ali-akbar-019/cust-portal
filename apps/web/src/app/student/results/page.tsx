'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';

interface CourseBreakdown {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  creditHours: number;
  percentage: number;
  letter: string;
  gradePoints: number;
  components: {
    component: string;
    marks: number;
    maxMarks: number;
  }[];
}

interface SemesterBreakdown {
  semester: number;
  term: string | null;
  courses: CourseBreakdown[];
  sgpa: number | null;
  creditHours: number;
}

interface Breakdown {
  semesters: SemesterBreakdown[];
  currentSemester: number;
  cgpa: number;
  totalCreditHours: number;
}

const ORDINAL = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) return `${n}st`;
  if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${n}rd`;

  return `${n}th`;
};

export default function StudentResultsPage() {
  const { accessToken, profile, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<Breakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTerm, setOpenTerm] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (authLoading || !accessToken) return;

    if (!profile?.studentId) {
      setError(
        'Could not resolve your student profile. Try logging out and back in.'
      );
      return;
    }

    apiFetch<Breakdown>(
      `/grades/student/${profile.studentId}`,
      { token: accessToken }
    )
      .then((res) => {
        setData(res);

        const lastFilled = [...res.semesters]
          .reverse()
          .find((semester) => semester.term !== null);

        setOpenTerm(
          lastFilled?.semester ??
            res.semesters[0]?.semester ??
            null
        );
      })
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load results'
        )
      );
  }, [accessToken, profile, authLoading]);

  async function handleDownloadTranscript() {
    if (!profile?.studentId || !accessToken) return;

    setIsDownloading(true);

    try {
      const base =
        process.env.NEXT_PUBLIC_API_URL ??
        'http://localhost:4000/api/v1';

      const response = await fetch(
        `${base}/grades/student/${profile.studentId}/transcript`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `transcript-${
        profile.enrollmentNo ?? profile.studentId
      }.pdf`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download transcript.');
    } finally {
      setIsDownloading(false);
    }
  }

  if (error) {
    return (
      <main className="p-5 sm:p-6 lg:p-10">
        <PageHeader
          title="Results"
          subtitle="Your complete academic record"
        />

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700">
          {error}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="p-5 sm:p-6 lg:p-10">
        <PageHeader
          title="Results"
          subtitle="Your complete academic record"
        />

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading results...
        </div>
      </main>
    );
  }

  const recordedSemesters = data.semesters.filter(
    (semester) => semester.term !== null
  );

  const recorded = recordedSemesters.length;

  const lastRecorded =
    recordedSemesters[recordedSemesters.length - 1];

  const cgpa = data.cgpa?.toFixed(2) ?? '—';

  return (
    <main className="min-w-0 bg-slate-50/50 p-5 sm:p-6 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <PageHeader
          eyebrow="Academic Record"
          title="Results & Transcript"
          subtitle={`Current semester: ${ORDINAL(
            data.currentSemester
          )} · ${recorded} semester${
            recorded === 1 ? '' : 's'
          } recorded`}
          action={
            <button
              type="button"
              onClick={handleDownloadTranscript}
              disabled={isDownloading}
              className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {isDownloading
                ? 'Preparing...'
                : 'Download Transcript'}
            </button>
          }
        />
      </div>

      {/* Academic summary */}
      <section className="mb-8">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {/* CGPA */}
            <div className="relative p-5 sm:p-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Cumulative GPA
              </p>

              <div className="mt-3 flex items-end gap-2">
                <span className="font-data text-4xl font-semibold tracking-tight text-slate-900">
                  {cgpa}
                </span>

                <span className="mb-1 text-xs text-slate-400">
                  / 4.00
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Across all recorded semesters
              </p>
            </div>

            {/* Current semester */}
            <div className="p-5 sm:p-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Current Semester
              </p>

              <p className="mt-3 font-data text-2xl font-semibold text-slate-900">
                {ORDINAL(data.currentSemester)}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Current academic period
              </p>
            </div>

            {/* Semesters */}
            <div className="p-5 sm:p-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Semesters Recorded
              </p>

              <p className="mt-3 font-data text-2xl font-semibold text-slate-900">
                {recorded}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Completed academic records
              </p>
            </div>

            {/* Credits */}
            <div className="p-5 sm:p-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Credit Hours
              </p>

              <p className="mt-3 font-data text-2xl font-semibold text-slate-900">
                {data.totalCreditHours}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Total recorded credits
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Empty state */}
      {data.semesters.length === 0 && (
        <div className="max-w-2xl">
          <EmptyState
            title="No results recorded yet"
            hint="Grades will appear here semester by semester as your teachers enter them."
          />
        </div>
      )}

      {/* Semester records */}
      {data.semesters.length > 0 && (
        <section className="max-w-5xl">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Academic History
              </p>

              <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                Semester Results
              </h2>
            </div>

            <p className="hidden text-xs text-slate-400 sm:block">
              {recorded} recorded
            </p>
          </div>

          <div className="space-y-3">
            {data.semesters.map((semester) => {
              const isOpen =
                openTerm === semester.semester;

              const isCurrent =
                semester.semester ===
                data.currentSemester;

              const isEmpty =
                semester.term === null;

              return (
                <div
                  key={semester.semester}
                  className={`overflow-hidden rounded-xl border bg-white transition-shadow ${
                    isCurrent
                      ? 'border-slate-300 shadow-sm'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Semester header */}
                  <button
                    type="button"
                    disabled={isEmpty}
                    onClick={() =>
                      setOpenTerm(
                        isEmpty
                          ? null
                          : isOpen
                            ? null
                            : semester.semester
                      )
                    }
                    className={`flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition sm:px-5 ${
                      isEmpty
                        ? 'cursor-default'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-data text-xs font-semibold ${
                          isCurrent
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {semester.semester}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-slate-900">
                            {ORDINAL(semester.semester)} Semester
                          </h3>

                          {isCurrent && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              Current
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {semester.term ??
                            'Not yet recorded'}
                        </p>
                      </div>
                    </div>

                    {isEmpty ? (
                      <span className="shrink-0 text-xs text-slate-400">
                        Pending
                      </span>
                    ) : (
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="hidden text-right sm:block">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            SGPA
                          </p>

                          <p className="font-data text-sm font-semibold text-slate-900">
                            {semester.sgpa?.toFixed(2) ?? '—'}
                          </p>
                        </div>

                        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

                        <div className="hidden text-right sm:block">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Credits
                          </p>

                          <p className="font-data text-sm font-medium text-slate-700">
                            {semester.creditHours}
                          </p>
                        </div>

                        <span className="ml-1 text-sm text-slate-400">
                          {isOpen ? '−' : '+'}
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Mobile semester meta */}
                  {!isEmpty && (
                    <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2.5 sm:hidden">
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-slate-400">
                          SGPA
                        </span>

                        <span className="ml-2 font-data text-xs font-semibold text-slate-800">
                          {semester.sgpa?.toFixed(2) ?? '—'}
                        </span>
                      </div>

                      <div className="h-3 w-px bg-slate-200" />

                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-slate-400">
                          Credits
                        </span>

                        <span className="ml-2 font-data text-xs font-medium text-slate-700">
                          {semester.creditHours}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Semester content */}
                  {isOpen && !isEmpty && (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-3 sm:p-5">
                      {semester.courses.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
                          <p className="text-sm font-medium text-slate-700">
                            No graded courses yet
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Courses for this semester haven't
                            been graded yet.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                          {/* Desktop table header */}
                          <div className="hidden grid-cols-[minmax(0,1fr)_90px_90px_80px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400 md:grid">
                            <span>Course</span>
                            <span className="text-right">
                              Marks
                            </span>
                            <span className="text-right">
                              Grade
                            </span>
                            <span className="text-right">
                              Credits
                            </span>
                          </div>

                          <div className="divide-y divide-slate-100">
                            {semester.courses.map((course) => (
                              <div
                                key={course.courseId}
                                className="px-4 py-4 transition hover:bg-slate-50/70"
                              >
                                {/* Desktop */}
                                <div className="hidden grid-cols-[minmax(0,1fr)_90px_90px_80px] items-center gap-4 md:grid">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                      {course.courseTitle}
                                    </p>

                                    <p className="mt-1 font-data text-xs text-slate-400">
                                      {course.courseCode}
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <span className="font-data text-sm text-slate-700">
                                      {course.percentage}%
                                    </span>
                                  </div>

                                  <div className="text-right">
                                    <span className="font-data text-base font-semibold text-slate-900">
                                      {course.letter}
                                    </span>

                                    <p className="mt-0.5 font-data text-[10px] text-slate-400">
                                      {course.gradePoints?.toFixed(2) ?? '—'} GP
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <span className="font-data text-sm text-slate-600">
                                      {course.creditHours}
                                    </span>
                                  </div>
                                </div>

                                {/* Mobile */}
                                <div className="md:hidden">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium leading-5 text-slate-900">
                                        {course.courseTitle}
                                      </p>

                                      <p className="mt-1 font-data text-xs text-slate-400">
                                        {course.courseCode} ·{' '}
                                        {course.creditHours} CH
                                      </p>
                                    </div>

                                    <div className="shrink-0 text-right">
                                      <p className="font-data text-xl font-semibold text-slate-900">
                                        {course.letter}
                                      </p>

                                      <p className="text-[10px] text-slate-400">
                                        {course.percentage}%
                                      </p>
                                    </div>
                                  </div>

                                  {course.components.length > 0 && (
                                    <div className="mt-3 border-t border-slate-100 pt-3">
                                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                        {course.components.map(
                                          (component, index) => (
                                            <span
                                              key={`${component.component}-${index}`}
                                              className="text-[11px] text-slate-500"
                                            >
                                              <span className="text-slate-400">
                                                {component.component}
                                              </span>{' '}
                                              <span className="font-data text-slate-700">
                                                {component.marks}/
                                                {component.maxMarks}
                                              </span>
                                            </span>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Footer note */}
      {lastRecorded &&
        lastRecorded.semester <
          data.currentSemester && (
          <div className="mt-6 max-w-3xl border-l-2 border-slate-200 pl-4">
            <p className="text-xs leading-5 text-slate-400">
              Earlier semesters may appear without grades until
              the registrar records those terms. Your academic
              history will update automatically as records are
              entered.
            </p>
          </div>
        )}
    </main>
  );
}