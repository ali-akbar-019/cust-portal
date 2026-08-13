'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError, absoluteFileUrl } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface MySection {
  id: string;
  course: {
    title: string;
    code: string;
  };
  enrolledCount: number;
}

interface AssignmentView {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
}

interface Submission {
  id: string;
  studentId: string;
  fileUrl: string;
  submittedAt: string;
  grade: number | null;
  feedback: string | null;
}

interface AssignmentDetail extends AssignmentView {
  submissions: Submission[];
}

interface RosterStudent {
  id: string;
  enrollmentNo: string;
}

export default function TeacherAssignmentsPage() {
  const { accessToken, profile } = useAuth();

  const [sections, setSections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
  });

  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [past, setPast] = useState<AssignmentView[]>([]);
  const [open, setOpen] = useState<AssignmentView[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);

  const [roster, setRoster] = useState<RosterStudent[]>([]);

  const [grades, setGrades] = useState<
    Record<string, { grade: string; feedback: string }>
  >({});

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'past' | 'open'>('open');

  /**
   * Load sections assigned to the current teacher.
   */
  useEffect(() => {
    if (!accessToken || !profile?.teacherId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    apiFetch<MySection[]>(
      `/teachers/${profile.teacherId}/sections`,
      { token: accessToken }
    )
      .then((sectionsData) => {
        setSections(sectionsData);

        if (sectionsData.length > 0) {
          setSectionId(sectionsData[0]?.id || '');
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
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [accessToken, profile?.teacherId]);

  /**
   * Load assignments and roster whenever the selected section changes.
   */
  useEffect(() => {
    if (!sectionId || !accessToken) {
      setAssignments([]);
      setRoster([]);
      setPast([]);
      setOpen([]);
      setSelectedId(null);
      setDetail(null);
      return;
    }

    setSelectedId(null);
    setDetail(null);
    setError(null);

    apiFetch<AssignmentView[]>(
      `/assignments/section/${sectionId}`,
      { token: accessToken }
    )
      .then(setAssignments)
      .catch((err) => {
        setAssignments([]);
        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load assignments'
        );
      });

    apiFetch<RosterStudent[]>(
      `/sections/${sectionId}/roster`,
      { token: accessToken }
    )
      .then(setRoster)
      .catch((err) => {
        setRoster([]);

        setError((currentError) => {
          if (currentError) return currentError;

          return err instanceof ApiError
            ? err.message
            : 'Failed to load section roster';
        });
      });
  }, [sectionId, accessToken]);

  /**
   * Split assignments into Past Due and Open.
   */
  useEffect(() => {
    const now = Date.now();

    const pastAssignments = assignments.filter(
      (assignment) =>
        new Date(assignment.deadline).getTime() < now
    );

    const openAssignments = assignments.filter(
      (assignment) =>
        new Date(assignment.deadline).getTime() >= now
    );

    setPast(pastAssignments);
    setOpen(openAssignments);
  }, [assignments]);

  /**
   * Load assignment details and submissions.
   */
  async function loadDetail(id: string) {
    if (!accessToken) {
      setError('Authentication required');
      return;
    }

    setError(null);
    setSelectedId(id);

    try {
      const data = await apiFetch<AssignmentDetail>(
        `/assignments/${id}`,
        { token: accessToken }
      );

      setDetail(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load assignment'
      );
    }
  }

  /**
   * Create a new assignment.
   */
  async function handleCreate() {
    if (!accessToken) {
      setCreateError('Authentication required');
      return;
    }

    if (!sectionId) {
      setCreateError('Please select a section');
      return;
    }

    if (!form.title.trim()) {
      setCreateError('Assignment title is required');
      return;
    }

    if (!form.deadline) {
      setCreateError('Assignment deadline is required');
      return;
    }

    setCreateStatus(null);
    setCreateError(null);

    try {
      await apiFetch('/assignments', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          sectionId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          deadline: form.deadline,
        }),
      });

      setCreateStatus('Assignment published.');

      setForm({
        title: '',
        description: '',
        deadline: '',
      });

      setSelectedId(null);
      setDetail(null);

      const data = await apiFetch<AssignmentView[]>(
        `/assignments/section/${sectionId}`,
        { token: accessToken }
      );

      setAssignments(data);
    } catch (err) {
      setCreateError(
        err instanceof ApiError
          ? err.message
          : 'Failed to create assignment'
      );
    }
  }

  /**
   * Grade a student submission.
   */
  async function handleGrade(submissionId: string) {
    if (!accessToken) {
      setError('Authentication required');
      return;
    }

    const entry = grades[submissionId];

    if (!entry?.grade.trim()) {
      setError('Please enter a grade');
      return;
    }

    const numericGrade = Number(entry.grade);

    if (
      !Number.isFinite(numericGrade) ||
      numericGrade < 0 ||
      numericGrade > 100
    ) {
      setError('Grade must be a number between 0 and 100');
      return;
    }

    setError(null);

    try {
      await apiFetch(
        `/assignments/submissions/${submissionId}/grade`,
        {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({
            grade: numericGrade,
            feedback: entry.feedback.trim(),
          }),
        }
      );

      if (selectedId) {
        await loadDetail(selectedId);
      }

      setGrades((prev) => {
        const next = { ...prev };
        delete next[submissionId];
        return next;
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to save grade'
      );
    }
  }

  /**
   * Get a student's enrollment number from the roster.
   */
  const studentName = (id: string) =>
    roster.find((student) => student.id === id)?.enrollmentNo ??
    id.slice(0, 8);

  /**
   * Current assignments displayed by the selected tab.
   */
  const visibleAssignments =
    activeTab === 'past' ? past : open;

  if (isLoading) {
    return (
      <main className="min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
        <PageHeader
          eyebrow="Faculty"
          title="Assignments"
          subtitle="Post assignments and grade student submissions"
        />

        <p className="text-sm text-slate-500">
          Loading your sections…
        </p>
      </main>
    );
  }

  return (

    <main className="min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
      <PageHeader
        eyebrow="Faculty"
        title="Assignments"
        subtitle="Post a new assignment for a section, then grade the submissions that come in before the deadline."
      />

      {/* Tabs: Past Due / Open */}
      <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-sm">
        <div className="grid grid-cols-2">
          <button
            type="button"
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'past' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('past')}
            aria-selected={activeTab === 'past'}
          >
            Past Due{' '}
            {past.length > 0 && (
              <span className="ml-1 text-xs text-red-600">
                ({past.length})
              </span>
            )}
          </button>

          <button
            type="button"
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'open' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('open')}
            aria-selected={activeTab === 'open'}
          >
            Open{' '}
            {open.length > 0 && (
              <span className="ml-1 text-xs text-slate-500">
                ({open.length})
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Section selector */}
      <label className="mb-8 block max-w-3xl">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Section</span>

        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
        >
          {sections.length === 0 && (
            <option value="">
              No sections assigned
            </option>
          )}

          {sections.map((section) => (
            <option
              key={section.id}
              value={section.id}
            >
              {section.course.title} ({section.course.code}) ·{' '}
              {section.enrolledCount} students
            </option>
          ))}
        </select>
      </label>

      <div className="mb-8 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
        {/* Create assignment */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
          <p className="font-serif text-base font-semibold text-slate-900">
            Post an assignment
          </p>

          <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Title</span>
            <input
            placeholder="Assignment 2 — Case study"
            value={form.title}
            onChange={(e) =>
              setForm((previous) => ({
                ...previous,
                title: e.target.value,
              }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Instructions</span>
            <textarea
            placeholder="Description / instructions"
            value={form.description}
            onChange={(e) =>
              setForm((previous) => ({
                ...previous,
                description: e.target.value,
              }))
            }
            rows={5}
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Deadline
            </span>

            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) =>
                setForm((previous) => ({
                  ...previous,
                  deadline: e.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </label>

          {createError && (
            <p className="text-sm text-red-600">
              {createError}
            </p>
          )}

          {createStatus && (
            <p className="text-sm text-green-700">
              {createStatus}
            </p>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={
              !sectionId ||
              !form.title.trim() ||
              !form.deadline
            }
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
          >
            Publish to{' '}
            {sections.find(
              (section) => section.id === sectionId
            )?.course.code ?? 'this section'}
          </button>
          </div>
        </div>

        {/* Assignment list */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
          <p className="mb-3 font-serif text-base font-semibold text-slate-900">
            Assignments posted{' '}
            <span className="text-sm font-normal text-slate-400">
              ({assignments.length})
            </span>
          </p>

          {assignments.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nothing posted for this section yet.
            </p>
          ) : visibleAssignments.length === 0 ? (
            <p className="text-sm text-slate-500">
              No {activeTab === 'past' ? 'past due' : 'open'}{' '}
              assignments.
            </p>
          ) : (
            <div className="space-y-2">
              {visibleAssignments.map((assignment) => {
                const isPast =
                  new Date(assignment.deadline).getTime() <
                  Date.now();

                return (
                  <button
                    type="button"
                    key={assignment.id}
                    onClick={() =>
                      loadDetail(assignment.id)
                    }
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-px ${selectedId === assignment.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {assignment.title}
                      </span>

                      <span className="block text-xs text-slate-400">
                        {new Date(
                          assignment.deadline
                        ).toLocaleString()}
                      </span>
                    </span>

                    <Ribbon
                      tone={
                        isPast ? 'crimson' : 'muted'
                      }
                    >
                      {isPast ? 'closed' : 'open'}
                    </Ribbon>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Global error */}
      {error && (
        <p className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Assignment detail */}
      {detail && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-serif text-lg font-semibold text-slate-900">
                {detail.title}
              </p>

              <p className="text-xs text-slate-400">
                Deadline{' '}
                {new Date(
                  detail.deadline
                ).toLocaleString()}{' '}
                · {detail.submissions.length} submission
                {detail.submissions.length === 1
                  ? ''
                  : 's'}{' '}
                received
              </p>
            </div>
          </div>

          {detail.submissions.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              hint="Students' work will appear here once they upload before the deadline."
            />
          ) : (
            <div className="grid max-w-3xl gap-3">
              {detail.submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-data text-sm font-medium text-slate-900">
                      {studentName(
                        submission.studentId
                      )}
                    </p>

                    <span className="text-xs text-slate-400">
                      Submitted{' '}
                      {new Date(
                        submission.submittedAt
                      ).toLocaleString()}
                    </span>
                  </div>

                  <a
                    href={absoluteFileUrl(
                      submission.fileUrl
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-3 inline-flex rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    View submission file
                  </a>

                  {submission.grade !== null ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm">
                      <p className="font-medium text-green-700">
                        Graded: {submission.grade}/100
                      </p>

                      {submission.feedback && (
                        <p className="mt-1 text-slate-600">
                          {submission.feedback}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <input
                        placeholder="Grade /100"
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        value={
                          grades[submission.id]?.grade ??
                          ''
                        }
                        onChange={(e) =>
                          setGrades((previous) => ({
                            ...previous,
                            [submission.id]: {
                              grade: e.target.value,
                              feedback:
                                previous[
                                  submission.id
                                ]?.feedback ?? '',
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm sm:w-28"
                      />

                      <input
                        placeholder="Feedback"
                        value={
                          grades[submission.id]
                            ?.feedback ?? ''
                        }
                        onChange={(e) =>
                          setGrades((previous) => ({
                            ...previous,
                            [submission.id]: {
                              grade:
                                previous[
                                  submission.id
                                ]?.grade ?? '',
                              feedback: e.target.value,
                            },
                          }))
                        }
                        className="w-full min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handleGrade(submission.id)
                        }
                        disabled={
                          !grades[submission.id]?.grade.trim()
                        }
                        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-40 sm:w-auto"
                      >
                        Save Grade
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>

  );
}