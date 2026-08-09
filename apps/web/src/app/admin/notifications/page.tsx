'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface Department {
  id: string;
  name: string;
  code: string;
}
interface SectionOption {
  id: string;
  course: { code: string; title: string };
}
interface AnnouncementView {
  id: string;
  title: string;
  message: string;
  target: string;
  createdAt: string;
  postedBy: { email: string; role: string };
}

export default function AdminNotificationsPage() {
  const { accessToken } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'ALL' | 'DEPARTMENT' | 'SECTION'>('ALL');
  const [departmentId, setDepartmentId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [feed, setFeed] = useState<AnnouncementView[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<Department[]>('/departments', { token: accessToken })
      .then((depts) => {
        setDepartments(depts);
        if (depts.length > 0) setDepartmentId(depts[0]?.id ?? '');
      })
      .catch(() => {});
    apiFetch<AnnouncementView[]>('/notifications', { token: accessToken }).then(setFeed).catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    if (!departmentId || !accessToken) return;
    apiFetch<SectionOption[]>('/sections?departmentId=' + encodeURIComponent(departmentId), { token: accessToken })
      .then((rows) => {
        setSections(rows);
        setSectionId(rows[0]?.id ?? '');
      })
      .catch(() => setSections([]));
  }, [departmentId, accessToken]);

  async function handlePost() {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/notifications', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          title,
          message,
          target,
          ...(target === 'DEPARTMENT' ? { departmentId } : {}),
          ...(target === 'SECTION' ? { sectionId } : {}),
        }),
      });
      setStatus(`Announcement sent to ${target === 'ALL' ? 'everyone' : target === 'DEPARTMENT' ? 'the department' : 'the section'}.`);
      setTitle('');
      setMessage('');
      setSectionId(sections[0]?.id ?? '');
      if (accessToken) {
        apiFetch<AnnouncementView[]>('/notifications', { token: accessToken }).then(setFeed).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to post announcement');
    }
  }

  const targetLabel =
    target === 'ALL'
      ? { text: 'All students & staff', tone: 'navy' as const }
      : target === 'DEPARTMENT'
        ? { text: departments.find((d) => d.id === departmentId)?.code ?? 'a department', tone: 'sapphire' as const }
        : { text: sections.find((s) => s.id === sectionId)?.course.code ?? 'a section', tone: 'gold' as const };

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Notices Board"
        title="Announcements"
        subtitle="Broadcast a notice to everyone, a single department, or the students of one section."
      />

      <div className="mb-8 ledger-card max-w-lg space-y-3 p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
          <input
            placeholder="e.g. Mid-term exam schedule released"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Message</span>
          <textarea
            placeholder="Write the full notice..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Audience</span>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as typeof target)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">Everyone</option>
            <option value="DEPARTMENT">A specific department</option>
            <option value="SECTION">A specific section</option>
          </select>
        </label>

        {target !== 'ALL' && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{target === 'DEPARTMENT' ? 'Department' : 'Section'}</span>
            {target === 'DEPARTMENT' ? (
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {sections.length === 0 && <option value="">No sections in this department</option>}
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.course.title} ({s.course.code})
                  </option>
                ))}
              </select>
            )}
          </label>
        )}

<div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            {title.trim() ? 'Will post to:' : 'Choose your audience'} <Ribbon tone={targetLabel.tone}>{targetLabel.text}</Ribbon>
          </span>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {status && <p className="text-sm text-green-700">{status}</p>}
        <button
          onClick={handlePost}
          disabled={!title.trim() || !message.trim()}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
        >
          Publish Announcement
        </button>
        <p className="text-xs text-slate-400">Notifications are in-app only for now — email delivery is a future upgrade.</p>
      </div>

      <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">Recently Published</h2>
      {feed.length === 0 ? (
        <EmptyState title="No announcements yet" hint="Announcements you publish will appear here." />
      ) : (
        <div className="max-w-2xl space-y-3">
          {feed.slice(0, 8).map((a) => (
            <article key={a.id} className="ledger-card p-5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{a.title}</p>
                <Ribbon tone={a.target === 'ALL' ? 'navy' : a.target === 'DEPARTMENT' ? 'sapphire' : 'gold'}>
                  {a.target === 'ALL' ? 'Everyone' : a.target.toLowerCase()}
                </Ribbon>
              </div>
              <p className="mb-2 whitespace-pre-line text-sm text-slate-600">{a.message}</p>
              <p className="text-xs text-slate-400">
                Posted {new Date(a.createdAt).toLocaleString()} by {a.postedBy.role === 'ADMIN' ? 'Admin' : 'Teacher'} {a.postedBy.email}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}