'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError, absoluteFileUrl } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface MySection {
  id: string;
  course: { title: string; code: string };
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

  const [form, setForm] = useState({ title: '', description: '', deadline: '' });
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !profile?.teacherId) return;
    apiFetch<MySection[]>(`/teachers/${profile.teacherId}/sections`, { token: accessToken })
      .then((s) => {
        setSections(s);
        if (s.length > 0) setSectionId(s[0]?.id ?? '');
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [accessToken, profile]);

  useEffect(() => {
    if (!sectionId || !accessToken) return;
    apiFetch<AssignmentView[]>(`/assignments/section/${sectionId}`, { token: accessToken })
      .then(setAssignments)
      .catch(() => {});
    apiFetch<RosterStudent[]>(`/sections/${sectionId}/roster`, { token: accessToken })
      .then(setRoster)
      .catch(() => {});
    setSelectedId(null);
    setDetail(null);
  }, [sectionId, accessToken]);

  async function loadDetail(id: string) {
    setError(null);
    setSelectedId(id);
    try {
      const data = await apiFetch<AssignmentDetail>(`/assignments/${id}`, { token: accessToken });
      setDetail(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load assignment');
    }
  }

  async function handleCreate() {
    setCreateStatus(null);
    setCreateError(null);
    try {
      await apiFetch('/assignments', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ sectionId, ...form }),
      });
      setCreateStatus('Assignment published.');
      setForm({ title: '', description: '', deadline: '' });
      setSelectedId(null);
      setDetail(null);
      const data = await apiFetch<AssignmentView[]>(`/assignments/section/${sectionId}`, { token: accessToken });
      setAssignments(data);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create assignment');
    }
  }

  async function handleGrade(submissionId: string) {
    const entry = grades[submissionId];
    if (!entry?.grade) return;
    try {
      await apiFetch(`/assignments/submissions/${submissionId}/grade`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ grade: Number(entry.grade), feedback: entry.feedback }),
      });
      if (selectedId) await loadDetail(selectedId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save grade');
    }
  }

  const studentName = (id: string) => roster.find((r) => r.id === id)?.enrollmentNo ?? id.slice(0, 8);

  if (isLoading) return <main className="p-6 lg:p-10"><PageHeader eyebrow="Faculty" title="Assignments" subtitle="Post assignments and grade student submissions" /><p className="text-sm text-slate-500">Loading your sections…</p></main>;

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Faculty"
        title="Assignments"
        subtitle="Post a new assignment for a section, then grade the submissions that come in before the deadline."
      />

      <label className="mb-8 flex max-w-md items-center gap-2">
        <span className="shrink-0 text-sm font-medium text-slate-700">Section</span>
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {sections.length === 0 && <option value="">No sections assigned</option>}
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.course.title} ({s.course.code}) · {s.enrolledCount} students
            </option>
          ))}
        </select>
      </label>

      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="ledger-card space-y-3 p-6">
          <p className="font-serif text-base font-semibold text-slate-900">Post an assignment</p>
          <input
            placeholder="Title e.g. Assignment 2 — Case study"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description / instructions"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Deadline</span>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          {createStatus && <p className="text-sm text-green-700">{createStatus}</p>}
          <button
            onClick={handleCreate}
            disabled={!sectionId || !form.title.trim() || !form.deadline}
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
          >
            Publish to {sections.find((s) => s.id === sectionId)?.course.code ?? 'this section'}
          </button>
        </div>

        <div className="ledger-card p-6">
          <p className="mb-3 font-serif text-base font-semibold text-slate-900">
            Assignments posted <span className="text-sm font-normal text-slate-400">({assignments.length})</span>
          </p>
          {assignments.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing posted for this section yet.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => {
                const past = new Date(a.deadline).getTime() < Date.now();
                return (
                  <button
                    key={a.id}
                    onClick={() => loadDetail(a.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md border p-3 text-left transition ${
                      selectedId === a.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">{a.title}</span>
                      <span className="block text-xs text-slate-400">{new Date(a.deadline).toLocaleString()}</span>
                    </span>
                    <Ribbon tone={past ? 'crimson' : 'muted'}>{past ? 'closed' : 'open'}</Ribbon>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {detail && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-serif text-lg font-semibold text-slate-900">{detail.title}</p>
              <p className="text-xs text-slate-400">
                Deadline {new Date(detail.deadline).toLocaleString()} · {detail.submissions.length} submission{detail.submissions.length === 1 ? '' : 's'} received
              </p>
            </div>
          </div>

          {detail.submissions.length === 0 ? (
            <EmptyState title="No submissions yet" hint="Students' work will appear here once they upload before the deadline." />
          ) : (
            <div className="max-w-2xl space-y-3">
              {detail.submissions.map((s) => (
                <div key={s.id} className="ledger-card p-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-data text-sm font-medium text-slate-900">{studentName(s.studentId)}</p>
                    <span className="text-xs text-slate-400">Submitted {new Date(s.submittedAt).toLocaleString()}</span>
                  </div>
                  <a href={absoluteFileUrl(s.fileUrl)} target="_blank" rel="noreferrer" className="mb-3 inline-block text-sm text-blue-600 underline">
                    View submission file
                  </a>
                  {s.grade !== null ? (
                    <div className="rounded-md bg-slate-50 p-3 text-sm">
                      <p className="font-medium text-green-700">Graded: {s.grade}/100</p>
                      {s.feedback && <p className="mt-1 text-slate-600">{s.feedback}</p>}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <input
                        placeholder="Grade /100"
                        type="number"
                        value={grades[s.id]?.grade ?? ''}
                        onChange={(e) => setGrades((prev) => ({ ...prev, [s.id]: { grade: e.target.value, feedback: prev[s.id]?.feedback ?? '' } }))}
                        className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        placeholder="Feedback"
                        value={grades[s.id]?.feedback ?? ''}
                        onChange={(e) => setGrades((prev) => ({ ...prev, [s.id]: { grade: prev[s.id]?.grade ?? '', feedback: e.target.value } }))}
                        className="w-full flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => handleGrade(s.id)}
                        disabled={!grades[s.id]?.grade}
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