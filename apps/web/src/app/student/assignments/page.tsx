'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';

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

type AssignmentTab = 'all' | 'past' | 'due-soon' | 'open';

const card = 'rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm';
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5';

export default function StudentAssignmentsPage() {
  const { accessToken, profile } = useAuth();
  const [mySections, setMySections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AssignmentTab>('all');
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;

    setLoadingSections(true);
    apiFetch<MySection[]>(`/students/${profile.studentId}/sections`, { token: accessToken })
      .then((sections) => {
        setMySections(Array.isArray(sections) ? sections : []);
        setSectionId(sections[0]?.id ?? '');
      })
      .catch(() => {
        setMySections([]);
        setSectionId('');
      })
      .finally(() => setLoadingSections(false));
  }, [accessToken, profile?.studentId]);

  useEffect(() => {
    if (!accessToken || !sectionId) {
      setAssignments([]);
      return;
    }

    setLoadingAssignments(true);
    setError(null);
    apiFetch<AssignmentView[]>(`/assignments/section/${sectionId}`, { token: accessToken })
      .then((data) => setAssignments(Array.isArray(data) ? data : []))
      .catch((err) => {
        setAssignments([]);
        setError(err instanceof ApiError ? err.message : 'Failed to load assignments');
      })
      .finally(() => setLoadingAssignments(false));
  }, [sectionId, accessToken]);

  const now = Date.now();

  const counts = useMemo(() => {
    const past = assignments.filter((a) => new Date(a.deadline).getTime() < now);
    const dueSoon = assignments.filter((a) => {
      const left = new Date(a.deadline).getTime() - now;
      return left >= 0 && left <= 7 * 864e5;
    });
    const open = assignments.filter((a) => new Date(a.deadline).getTime() >= now);
    return { past: past.length, dueSoon: dueSoon.length, open: open.length };
  }, [assignments, now]);

  const renderedAssignments = useMemo(() => {
    return [...assignments]
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .filter((assignment) => {
        const left = new Date(assignment.deadline).getTime() - now;
        if (activeTab === 'all') return true;
        if (activeTab === 'past') return left < 0;
        if (activeTab === 'due-soon') return left >= 0 && left <= 7 * 864e5;
        return left > 7 * 864e5;
      });
  }, [assignments, activeTab, now]);

  async function handleUpload(assignment: AssignmentView, file: File) {
    if (!accessToken || uploadingFor) return;

    setUploadingFor(assignment.id);
    setError(null);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
      const uploadResponse = await fetch(`${base}/assignments/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      const uploaded = (await uploadResponse.json()) as { fileUrl?: string };
      if (!uploaded.fileUrl) throw new Error('Upload did not return a file URL');

      await apiFetch(`/assignments/${assignment.id}/submit`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ fileUrl: uploaded.fileUrl }),
      });

      setStatus(`“${assignment.title}” was submitted successfully.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Submission failed. Please try again.');
    } finally {
      setUploadingFor(null);
    }
  }

  return (
    <main className="min-w-0 overflow-x-hidden bg-slate-50/50 p-4 sm:p-6 lg:p-8 xl:p-10">
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader
          eyebrow="Coursework"
          title="Assignments"
          subtitle="Keep track of deadlines, download briefs, and submit your work from one place."
        />

        <section className={`${card} mb-7 mt-7 p-4 sm:p-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Course</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Choose a course to view its assignments</p>
            </div>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={loadingSections || mySections.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 sm:max-w-md"
            >
              {mySections.length === 0 && <option value="">No enrolled courses</option>}
              {mySections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.course.code} · {section.course.title}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Total', assignments.length],
            ['Open', counts.open],
            ['Due in 7 days', counts.dueSoon],
            ['Past due', counts.past],
          ].map(([label, value]) => (
            <div key={label} className={`${card} p-4 sm:p-5`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
              <p className="mt-2 font-data text-2xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        {(error || status) && (
          <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600'}`}>
            {error ?? status}
          </div>
        )}

        <div className="mb-5 overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max gap-5">
            {([
              ['all', 'All', assignments.length],
              ['due-soon', 'Due soon', counts.dueSoon],
              ['open', 'Open later', Math.max(0, counts.open - counts.dueSoon)],
              ['past', 'Past due', counts.past],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${activeTab === value ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
              >
                {label} <span className="ml-1 font-data text-xs text-slate-400">{count}</span>
              </button>
            ))}
          </div>
        </div>

        {loadingAssignments ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => <div key={item} className={`${card} h-32 animate-pulse bg-slate-100`} />)}
          </div>
        ) : assignments.length === 0 && sectionId ? (
          <EmptyState title="No assignments posted yet" hint="Your teacher has not published any assignments for this course." />
        ) : renderedAssignments.length === 0 ? (
          <EmptyState title="Nothing in this category" hint="Try another assignment filter." />
        ) : (
          <div className="space-y-3">
            {renderedAssignments.map((assignment) => {
              const msLeft = new Date(assignment.deadline).getTime() - now;
              const pastDue = msLeft < 0;
              const daysLeft = Math.max(0, Math.ceil(msLeft / 864e5));
              const urgent = !pastDue && daysLeft <= 3;

              return (
                <article key={assignment.id} className={`${card} p-4 sm:p-5`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">{assignment.title}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${pastDue ? 'bg-slate-100 text-slate-500' : urgent ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {pastDue ? 'Closed' : daysLeft === 0 ? 'Due today' : daysLeft <= 3 ? `Due in ${daysLeft}d` : 'Open'}
                        </span>
                      </div>
                      {assignment.description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{assignment.description}</p>}
                      <p className="mt-3 text-xs text-slate-400">
                        Deadline · {new Date(assignment.deadline).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {assignment.fileUrl && (
                        <a href={assignment.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                          View brief
                        </a>
                      )}
                      <label className={`inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-medium transition ${pastDue || uploadingFor === assignment.id ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'cursor-pointer bg-slate-900 text-white hover:bg-slate-800'}`}>
                        {uploadingFor === assignment.id ? 'Uploading…' : pastDue ? 'Closed' : 'Submit work'}
                        <input
                          type="file"
                          disabled={pastDue || uploadingFor !== null}
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (file) void handleUpload(assignment, file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
