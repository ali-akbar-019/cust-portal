'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { AdminButton, AdminField, AdminMessage, AdminPill, AdminSectionHeading, AdminSurface, inputClass, selectClass } from '../_components/admin-ui';

interface Department { id: string; name: string; code: string; }
interface SectionOption { id: string; course: { code: string; title: string }; }
interface AnnouncementView { id: string; title: string; message: string; target: string; createdAt: string; postedBy: { email: string; role: string }; }

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
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<Department[]>('/departments', { token: accessToken }).then((depts) => {
      setDepartments(depts);
      if (depts.length > 0) setDepartmentId((current) => current || depts[0]?.id || '');
    }).catch(() => {});
    apiFetch<AnnouncementView[]>('/notifications', { token: accessToken }).then(setFeed).catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    if (!departmentId || !accessToken) return;
    apiFetch<SectionOption[]>(`/sections?departmentId=${encodeURIComponent(departmentId)}`, { token: accessToken })
      .then((rows) => { setSections(rows); setSectionId(rows[0]?.id ?? ''); })
      .catch(() => { setSections([]); setSectionId(''); });
  }, [departmentId, accessToken]);

  async function handlePost() {
    setStatus(null); setError(null);
    if (!title.trim() || !message.trim()) return;
    if (target === 'DEPARTMENT' && !departmentId) { setError('Choose a department.'); return; }
    if (target === 'SECTION' && !sectionId) { setError('Choose a section.'); return; }
    setPosting(true);
    try {
      await apiFetch('/notifications', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          target,
          ...(target === 'DEPARTMENT' ? { departmentId } : {}),
          ...(target === 'SECTION' ? { sectionId } : {}),
        }),
      });
      setStatus(`Announcement sent to ${target === 'ALL' ? 'everyone' : target === 'DEPARTMENT' ? 'the selected department' : 'the selected section'}.`);
      setTitle('');
      setMessage('');
      if (accessToken) apiFetch<AnnouncementView[]>('/notifications', { token: accessToken }).then(setFeed).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to post announcement');
    } finally { setPosting(false); }
  }

  const targetLabel = target === 'ALL'
    ? 'Everyone'
    : target === 'DEPARTMENT'
      ? departments.find((d) => d.id === departmentId)?.code ?? 'Department'
      : sections.find((s) => s.id === sectionId)?.course.code ?? 'Section';

  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">
      <PageHeader eyebrow="Notices Board" title="Announcements" subtitle="Publish clear, targeted notices to the university community." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AdminSurface className="p-5 sm:p-6">
          <AdminSectionHeading title="Compose announcement" subtitle="Choose the audience before publishing." />
          <div className="space-y-4">
            <AdminField label="Title">
              <input className={inputClass} placeholder="Mid-term exam schedule released" value={title} onChange={(e) => setTitle(e.target.value)} />
            </AdminField>
            <AdminField label="Message">
              <textarea className={`${inputClass} min-h-32 resize-y`} placeholder="Write the full notice…" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} />
            </AdminField>
            <AdminField label="Audience">
              <select className={selectClass} value={target} onChange={(e) => setTarget(e.target.value as typeof target)}>
                <option value="ALL">Everyone</option>
                <option value="DEPARTMENT">Specific department</option>
                <option value="SECTION">Specific section</option>
              </select>
            </AdminField>

            {target === 'DEPARTMENT' && (
              <AdminField label="Department">
                <select className={selectClass} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                </select>
              </AdminField>
            )}

            {target === 'SECTION' && (
              <AdminField label="Section">
                <select className={selectClass} value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!sections.length}>
                  {!sections.length && <option value="">No sections in this department</option>}
                  {sections.map((s) => <option key={s.id} value={s.id}>{s.course.title} ({s.course.code})</option>)}
                </select>
              </AdminField>
            )}

            <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Audience</p><p className="mt-1 text-sm font-medium text-slate-800">{targetLabel}</p></div>
              <AdminPill tone="dark">{target}</AdminPill>
            </div>

            {error && <AdminMessage tone="error">{error}</AdminMessage>}
            {status && <AdminMessage tone="success">{status}</AdminMessage>}
            <AdminButton onClick={handlePost} disabled={posting || !title.trim() || !message.trim()} className="w-full sm:w-auto">
              {posting ? 'Publishing…' : 'Publish announcement'}
            </AdminButton>
            <p className="text-xs leading-5 text-slate-400">Announcements are delivered in-app. Email delivery can be added later.</p>
          </div>
        </AdminSurface>

        <div className="min-w-0">
          <AdminSectionHeading title="Recently published" subtitle={`${Math.min(feed.length, 8)} recent announcement${Math.min(feed.length, 8) === 1 ? '' : 's'}`} />
          {feed.length === 0 ? (
            <EmptyState title="No announcements yet" hint="Published announcements will appear here." />
          ) : (
            <div className="space-y-3">
              {feed.slice(0, 8).map((a) => (
                <AdminSurface key={a.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-950">{a.title}</h3>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{a.message}</p>
                    </div>
                    <AdminPill tone={a.target === 'ALL' ? 'dark' : 'neutral'}>{a.target === 'ALL' ? 'Everyone' : a.target}</AdminPill>
                  </div>
                  <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">Posted {new Date(a.createdAt).toLocaleString()} · {a.postedBy.role === 'ADMIN' ? 'Admin' : 'Teacher'} {a.postedBy.email}</p>
                </AdminSurface>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
