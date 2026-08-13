'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError, absoluteFileUrl } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';
import { RoleLayout } from '@/components/shared/role-layout';

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
      <main className="p-6 lg:p-10">
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

    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Faculty"
        title="Assignments"
        subtitle="Post a new assignment for a section, then grade the submissions that come in before the deadline."
      />

      {/* Tabs: Past Due / Open */}
      <div className="mb-4 overflow-hidden rounded-md border border-slate-300">
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            className={`flex-1 border-b-2 py-2 text-sm font-medium transition-colors hover:bg-slate-50 ${activeTab === 'past'
              ? 'border-b-red-600 bg-white text-slate-900'
              : 'border-b-transparent text-slate-500'
              }`}
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
            className={`flex-1 border-b-2 py-2 text-sm font-medium transition-colors hover:bg-slate-50 ${activeTab === 'open'
              ? 'border-b-red-600 bg-white text-slate-900'
              : 'border-b-transparent text-slate-500'
              }`}
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
      <label className="mb-8 flex max-w-md items-center gap-2">
        <span className="shrink-0 text-sm font-medium text-slate-700">
          Section
        </span>

        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
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

      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Create assignment */}
        <div className="ledger-card space-y-3 p-6">
          <p className="font-serif text-base font-semibold text-slate-900">
            Post an assignment
          </p>

          <input
            placeholder="Title e.g. Assignment 2 — Case study"
            value={form.title}
            onChange={(e) =>
              setForm((previous) => ({
                ...previous,
                title: e.target.value,
              }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          <textarea
            placeholder="Description / instructions"
            value={form.description}
            onChange={(e) =>
              setForm((previous) => ({
                ...previous,
                description: e.target.value,
              }))
            }
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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

        {/* Assignment list */}
        <div className="ledger-card p-6">
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
                    className={`flex w-full items-center justify-between gap-2 rounded-md border p-3 text-left transition ${selectedId === assignment.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
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
            <div className="max-w-2xl space-y-3">
              {detail.submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="ledger-card p-5"
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
                    className="mb-3 inline-block text-sm text-blue-600 underline"
                  >
                    View submission file
                  </a>

                  {submission.grade !== null ? (
                    <div className="rounded-md bg-slate-50 p-3 text-sm">
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
                        className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                        className="w-full flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handleGrade(submission.id)
                        }
                        disabled={
                          !grades[submission.id]?.grade.trim()
                        }
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
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