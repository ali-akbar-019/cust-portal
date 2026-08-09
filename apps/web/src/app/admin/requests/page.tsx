'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type RequestType = 'TRANSCRIPT' | 'LETTER' | 'COURSE_WITHDRAW' | 'PERSONAL_INFO_CHANGE' | 'GENERAL';

interface RequestView {
  id: string;
  type: RequestType;
  details: string;
  status: RequestStatus;
  adminRemarks?: string | null;
  createdAt: string;
  student: { enrollmentNo: string; user: { email: string } };
}

const STATUS_TONE: Record<RequestStatus, 'muted' | 'emerald' | 'crimson'> = {
  PENDING: 'muted',
  APPROVED: 'emerald',
  REJECTED: 'crimson',
};

const TYPE_LABEL: Record<RequestType, string> = {
  TRANSCRIPT: 'Transcript',
  LETTER: 'Letter',
  COURSE_WITHDRAW: 'Course Withdraw',
  PERSONAL_INFO_CHANGE: 'Personal Info Change',
  GENERAL: 'General',
};

export default function AdminRequestsPage() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [typeFilter, setTypeFilter] = useState<'ALL' | RequestType>('ALL');
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    apiFetch<RequestView[]>('/requests', { token: accessToken })
      .then(setRequests)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load requests'));
  }

  useEffect(load, [accessToken]);

  async function resolve(id: string, status: 'APPROVED' | 'REJECTED') {
    try {
      await apiFetch(`/requests/${id}`, {
        method: 'PUT',
        token: accessToken,
        body: JSON.stringify({ status, adminRemarks: remarks[id] }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resolve request');
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const withdrawnCount = requests.filter((r) => r.type === 'COURSE_WITHDRAW').length;
  const typeCounts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = typeFilter === 'ALL' ? requests : requests.filter((r) => r.type === typeFilter);
  const types: (RequestType | 'ALL')[] = ['ALL', 'TRANSCRIPT', 'LETTER', 'COURSE_WITHDRAW', 'PERSONAL_INFO_CHANGE', 'GENERAL'];

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Registrar Office"
        title="Requests Triage"
        subtitle="Approve or reject student requests. Approving a course-withdraw frees the section seat automatically."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{requests.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pending action</p>
          <p className="font-serif text-2xl font-semibold text-yellow-500">{pendingCount}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Approved</p>
          <p className="font-serif text-2xl font-semibold text-green-700">{approvedCount}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Course-withdraw requests</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{withdrawnCount}</p>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {types.filter((t) => t === 'ALL' || (typeCounts[t] ?? 0) > 0).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              typeFilter === t ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:text-slate-900'
            }`}
          >
            {t === 'ALL' ? 'All types' : TYPE_LABEL[t]}
            {t !== 'ALL' && <span className="ml-1 opacity-70">{typeCounts[t]}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={requests.length === 0 ? 'No requests on file' : 'No requests of this type'} hint={requests.length === 0 ? 'Student requests land here as soon as they are filed.' : undefined} />
      ) : (
        <div className="max-w-2xl space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="ledger-card p-5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{TYPE_LABEL[r.type]}</p>
                <Ribbon tone={STATUS_TONE[r.status]}>{r.status}</Ribbon>
              </div>
              <p className="mb-2 text-sm text-slate-600">{r.details}</p>
              <p className="mb-3 text-xs text-slate-400">
                <span className="font-data">{r.student.enrollmentNo}</span> · {r.student.user.email} · filed {new Date(r.createdAt).toLocaleString()}
              </p>
              {r.status === 'PENDING' ? (
                <>
                  <textarea
                    placeholder="Remarks (optional) — shown to the student"
                    value={remarks[r.id] ?? ''}
                    onChange={(e) => setRemarks((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    rows={2}
                    className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolve(r.id, 'APPROVED')}
                      className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-green-700"
                    >
                      Approve{r.type === 'COURSE_WITHDRAW' ? ' & Withdraw Course' : ''}
                    </button>
                    <button
                      onClick={() => resolve(r.id, 'REJECTED')}
                      className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">
                  Resolved with status {r.status.toLowerCase()}
                  {remarks[r.id] || r.adminRemarks ? ` — ${remarks[r.id] ?? r.adminRemarks}` : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}