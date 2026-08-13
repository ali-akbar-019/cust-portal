'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { AdminButton, AdminMessage, AdminPill, AdminSectionHeading, AdminStat, AdminSurface, inputClass } from '../_components/admin-ui';

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type RequestType = 'TRANSCRIPT' | 'LETTER' | 'COURSE_WITHDRAW' | 'PERSONAL_INFO_CHANGE' | 'GENERAL';
interface RequestView { id: string; type: RequestType; details: string; status: RequestStatus; adminRemarks?: string | null; createdAt: string; student: { enrollmentNo: string; user: { email: string } }; }

const STATUS_LABEL: Record<RequestStatus, string> = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };
const TYPE_LABEL: Record<RequestType, string> = { TRANSCRIPT: 'Transcript', LETTER: 'Letter', COURSE_WITHDRAW: 'Course withdrawal', PERSONAL_INFO_CHANGE: 'Personal info change', GENERAL: 'General' };

export default function AdminRequestsPage() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [typeFilter, setTypeFilter] = useState<'ALL' | RequestType>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    apiFetch<RequestView[]>('/requests', { token: accessToken })
      .then(setRequests)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load requests'));
  }
  useEffect(load, [accessToken]);

  async function resolve(id: string, status: 'APPROVED' | 'REJECTED') {
    setError(null); setSavingId(id);
    try {
      await apiFetch(`/requests/${id}`, { method: 'PUT', token: accessToken, body: JSON.stringify({ status, adminRemarks: remarks[id]?.trim() || undefined }) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resolve request');
    } finally { setSavingId(null); }
  }

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const withdrawnCount = requests.filter((r) => r.type === 'COURSE_WITHDRAW').length;
  const filtered = useMemo(() => typeFilter === 'ALL' ? requests : requests.filter((r) => r.type === typeFilter), [requests, typeFilter]);
  const types: (RequestType | 'ALL')[] = ['ALL', 'TRANSCRIPT', 'LETTER', 'COURSE_WITHDRAW', 'PERSONAL_INFO_CHANGE', 'GENERAL'];

  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">
      <PageHeader eyebrow="Registrar Office" title="Requests Triage" subtitle="Process transcript, letter, withdrawal, personal-information, and general requests." />

      <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStat label="Total" value={requests.length} />
        <AdminStat label="Pending" value={pendingCount} detail="Needs action" />
        <AdminStat label="Approved" value={approvedCount} />
        <AdminStat label="Withdrawals" value={withdrawnCount} />
      </div>

      {error && <div className="mb-5"><AdminMessage tone="error">{error}</AdminMessage></div>}

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {types.filter((t) => t === 'ALL' || requests.some((r) => r.type === t)).map((t) => (
          <button key={t} type="button" onClick={() => setTypeFilter(t)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition ${typeFilter === t ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'}`}>
            {t === 'ALL' ? 'All types' : TYPE_LABEL[t]}{t !== 'ALL' && <span className="ml-1.5 opacity-70">{requests.filter((r) => r.type === t).length}</span>}
          </button>
        ))}
      </div>

      <AdminSectionHeading title="Request queue" subtitle={`${filtered.length} visible request${filtered.length === 1 ? '' : 's'}`} />

      {filtered.length === 0 ? (
        <EmptyState title={requests.length === 0 ? 'No requests on file' : 'No requests match this filter'} hint="Student requests appear here as soon as they are submitted." />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <AdminSurface key={r.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminPill tone="dark">{TYPE_LABEL[r.type]}</AdminPill>
                    <AdminPill tone={r.status === 'PENDING' ? 'warning' : r.status === 'APPROVED' ? 'success' : 'danger'}>{STATUS_LABEL[r.status]}</AdminPill>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{r.details}</p>
                  <p className="mt-3 text-xs text-slate-400"><span className="font-data">{r.student.enrollmentNo}</span> · {r.student.user.email} · filed {new Date(r.createdAt).toLocaleString()}</p>
                </div>

                {r.status === 'PENDING' ? (
                  <div className="w-full shrink-0 lg:max-w-sm">
                    <textarea className={`${inputClass} min-h-20 resize-y`} rows={2} placeholder="Remarks for the student (optional)" value={remarks[r.id] ?? ''} onChange={(e) => setRemarks((prev) => ({ ...prev, [r.id]: e.target.value }))} />
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <AdminButton disabled={savingId === r.id} onClick={() => resolve(r.id, 'APPROVED')} className="flex-1">{savingId === r.id ? 'Saving…' : r.type === 'COURSE_WITHDRAW' ? 'Approve & withdraw' : 'Approve'}</AdminButton>
                      <AdminButton variant="secondary" disabled={savingId === r.id} onClick={() => resolve(r.id, 'REJECTED')} className="flex-1">Reject</AdminButton>
                    </div>
                  </div>
                ) : (
                  <div className="w-full shrink-0 rounded-xl bg-slate-50 p-4 lg:max-w-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Resolution</p>
                    <p className="mt-2 text-sm text-slate-600">{r.adminRemarks || 'No remarks were recorded.'}</p>
                  </div>
                )}
              </div>
            </AdminSurface>
          ))}
        </div>
      )}
    </main>
  );
}
