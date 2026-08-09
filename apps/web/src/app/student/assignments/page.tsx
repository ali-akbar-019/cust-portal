'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Ribbon } from '@/components/ui/ribbon';

interface MySection {
  id: string;
  course: { title: string; code: string };
}
interface AssignmentView {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  fileUrl: string | null;
}

export default function StudentAssignmentsPage() {
  const { accessToken, profile } = useAuth();
  const [mySections, setMySections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<MySection[]>(`/students/${profile.studentId}/sections`, { token: accessToken })
      .then((sections) => {
        setMySections(sections);
        if (sections.length > 0) setSectionId(sections[0]?.id ?? '');
      })
      .catch(() => {});
  }, [accessToken, profile]);

  async function load() {
    if (!sectionId || !accessToken) return;
    setError(null);
    try {
      const data = await apiFetch<AssignmentView[]>(`/assignments/section/${sectionId}`, { token: accessToken });
      setAssignments(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load assignments');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, accessToken]);

  async function handleSubmit(assignmentId: string, file: File) {
    setStatus(null);
    setError(null);
    setUploadingFor(assignmentId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/assignments/upload`,
        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData },
      );
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { fileUrl } = await uploadRes.json();

      await apiFetch(`/assignments/${assignmentId}/submit`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ fileUrl }),
      });
      setStatus('Submitted successfully — your work is with the teacher.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed — check the deadline hasn't passed");
    } finally {
      setUploadingFor(null);
    }
  }

  const now = Date.now();
  const pastDue = assignments.filter((a) => new Date(a.deadline).getTime() < now);
  const dueSoon = assignments.filter((a) => {
    const t = new Date(a.deadline).getTime() - now;
    return t >= 0 && t <= 7 * 864e5;
  });
  const open = assignments.filter((a) => new Date(a.deadline).getTime() >= now);

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Coursework"
        title="Assignments"
        subtitle="See what's due, download the brief, and submit your work before each deadline."
      />

      <div className="mb-6 max-w-md">
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {mySections.length === 0 && <option value="">No enrolled courses yet</option>}
          {mySections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.course.title} ({s.course.code})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assignments" value={String(assignments.length)} />
        <StatCard label="Open" value={String(open.length)} hint="Deadline still ahead" />
        <StatCard label="Due within a week" value={String(dueSoon.length)} hint={dueSoon.length > 0 ? 'Plan your time' : undefined} />
        <StatCard label="Past due" value={String(pastDue.length)} hint="Submissions closed" />
      </div>

      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {status && <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{status}</p>}

      {assignments.length === 0 && sectionId && (
        <EmptyState title="No assignments posted for this course yet" hint="Your teacher hasn't published anything — check back after your next class." />
      )}

      <div className="max-w-2xl space-y-3">
        {assignments.map((a) => {
          const msLeft = new Date(a.deadline).getTime() - now;
          const isPastDue = msLeft < 0;
          const daysLeft = Math.ceil(msLeft / 864e5);
          return (
            <div key={a.id} className="ledger-card p-5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{a.title}</p>
                {isPastDue ? (
                  <Ribbon tone="crimson">Closed</Ribbon>
                ) : daysLeft <= 3 ? (
                  <Ribbon tone="gold">{daysLeft === 0 ? 'Due today' : `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}</Ribbon>
                ) : (
                  <Ribbon tone="muted">Open</Ribbon>
                )}
              </div>
              {a.description && <p className="mb-2 text-sm text-slate-600">{a.description}</p>}
              <p className="mb-3 text-xs text-slate-400">
                Deadline {new Date(a.deadline).toLocaleString()}{' '}
                {!isPastDue && `(${daysLeft <= 0 ? 'by the end of today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} from now`})`}
              </p>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <span className="text-lg leading-none">↑</span>
                <span>{uploadingFor === a.id ? 'Uploading…' : isPastDue ? 'Submissions closed' : 'Submit your work'}</span>
                <input
                  type="file"
                  disabled={isPastDue || uploadingFor === a.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSubmit(a.id, file);
                  }}
                  className="hidden"
                />
              </label>
              {isPastDue && <p className="mt-2 text-xs text-red-500">The deadline has passed — the server rejects late submissions.</p>}
            </div>
          );
        })}
      </div>
    </main>
  );
}