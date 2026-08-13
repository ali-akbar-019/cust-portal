'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { AdminButton, AdminMessage, AdminPill, AdminSectionHeading, AdminStat, AdminSurface, inputClass } from '../_components/admin-ui';

type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
interface ComplaintView { id: string; subject: string; description: string; status: ComplaintStatus; createdAt: string; response: string | null; student: { enrollmentNo: string; user: { email: string } }; }

const statusLabel: Record<ComplaintStatus, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved' };

export default function AdminComplaintsPage() {
  const { accessToken } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintView[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'ALL' | ComplaintStatus>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    apiFetch<ComplaintView[]>('/complaints', { token: accessToken })
      .then(setComplaints)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load complaints'));
  }
  useEffect(load, [accessToken]);

  async function handleUpdate(id: string, status: ComplaintStatus) {
    setError(null); setSavingId(id);
    try {
      await apiFetch(`/complaints/${id}`, { method: 'PUT', token: accessToken, body: JSON.stringify({ status, response: responses[id]?.trim() || undefined }) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update complaint');
    } finally { setSavingId(null); }
  }

  const counts = {
    OPEN: complaints.filter((c) => c.status === 'OPEN').length,
    IN_PROGRESS: complaints.filter((c) => c.status === 'IN_PROGRESS').length,
    RESOLVED: complaints.filter((c) => c.status === 'RESOLVED').length,
  };
  const filtered = useMemo(() => filter === 'ALL' ? complaints : complaints.filter((c) => c.status === filter), [complaints, filter]);

  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">
      <PageHeader eyebrow="Student Services" title="Complaints Triage" subtitle="Review student issues, keep a response trail, and move each case to resolution." />

      <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStat label="Total" value={complaints.length} />
        <AdminStat label="Open" value={counts.OPEN} detail="Needs review" />
        <AdminStat label="In progress" value={counts.IN_PROGRESS} />
        <AdminStat label="Resolved" value={counts.RESOLVED} />
      </div>

      {error && <div className="mb-5"><AdminMessage tone="error">{error}</AdminMessage></div>}

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition ${filter === s ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'}`}>
            {s === 'ALL' ? 'All complaints' : statusLabel[s]}{s !== 'ALL' && <span className="ml-1.5 opacity-70">{counts[s]}</span>}
          </button>
        ))}
      </div>

      <AdminSectionHeading title="Case queue" subtitle={`${filtered.length} visible case${filtered.length === 1 ? '' : 's'}`} />

      {filtered.length === 0 ? (
        <EmptyState title={complaints.length === 0 ? 'No complaints filed' : 'No complaints match this filter'} hint={complaints.length === 0 ? 'New student complaints will appear here.' : 'Try another status filter.'} />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filtered.map((c) => (
            <AdminSurface key={c.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{c.student.enrollmentNo}</p>
                  <h3 className="mt-1 font-serif text-xl font-semibold text-slate-950">{c.subject}</h3>
                </div>
                <AdminPill tone={c.status === 'OPEN' ? 'danger' : c.status === 'IN_PROGRESS' ? 'warning' : 'success'}>{statusLabel[c.status]}</AdminPill>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{c.description}</p>
                <p className="mt-3 text-xs text-slate-400">{c.student.user.email} · filed {new Date(c.createdAt).toLocaleString()}</p>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Response to student</label>
                <textarea className={`${inputClass} min-h-24 resize-y`} rows={3} placeholder="Write a response…" value={responses[c.id] ?? c.response ?? ''} onChange={(e) => setResponses((prev) => ({ ...prev, [c.id]: e.target.value }))} />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {c.status !== 'IN_PROGRESS' && <AdminButton variant="secondary" disabled={savingId === c.id} onClick={() => handleUpdate(c.id, 'IN_PROGRESS')} className="w-full sm:w-auto">Mark in progress</AdminButton>}
                {c.status !== 'RESOLVED' && <AdminButton disabled={savingId === c.id} onClick={() => handleUpdate(c.id, 'RESOLVED')} className="w-full sm:w-auto">{savingId === c.id ? 'Saving…' : 'Resolve & reply'}</AdminButton>}
              </div>
            </AdminSurface>
          ))}
        </div>
      )}
    </main>
  );
}
