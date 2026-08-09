'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

interface ComplaintView {
  id: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  response: string | null;
  student: { enrollmentNo: string; user: { email: string } };
}

const STATUS_TONE: Record<ComplaintStatus, 'crimson' | 'gold' | 'emerald'> = {
  OPEN: 'crimson',
  IN_PROGRESS: 'gold',
  RESOLVED: 'emerald',
};

export default function AdminComplaintsPage() {
  const { accessToken } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintView[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'ALL' | ComplaintStatus>('ALL');
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    apiFetch<ComplaintView[]>('/complaints', { token: accessToken })
      .then(setComplaints)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load complaints'));
  }

  useEffect(load, [accessToken]);

  async function handleUpdate(id: string, status: ComplaintStatus) {
    try {
      await apiFetch(`/complaints/${id}`, {
        method: 'PUT',
        token: accessToken,
        body: JSON.stringify({ status, response: responses[id] }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update complaint');
    }
  }

  const statusCounts = {
    OPEN: complaints.filter((c) => c.status === 'OPEN').length,
    IN_PROGRESS: complaints.filter((c) => c.status === 'IN_PROGRESS').length,
    RESOLVED: complaints.filter((c) => c.status === 'RESOLVED').length,
  };
  const filtered = filter === 'ALL' ? complaints : complaints.filter((c) => c.status === filter);

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Student Services"
        title="Complaints Triage"
        subtitle="Work through student complaints — open items are shown first, and every one needs a response before closing."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{complaints.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Open</p>
          <p className="font-serif text-2xl font-semibold text-red-600">{statusCounts.OPEN}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">In progress</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{statusCounts.IN_PROGRESS}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Resolved</p>
          <p className="font-serif text-2xl font-semibold text-green-700">{statusCounts.RESOLVED}</p>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              filter === s ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:text-slate-900'
            }`}
          >
            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ').toLowerCase()}
            {s !== 'ALL' && <span className="ml-1 opacity-70">{statusCounts[s]}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={complaints.length === 0 ? 'No complaints filed' : `No ${filter === 'ALL' ? '' : filter.toLowerCase().replace(/_/g, ' ')} complaints`} hint={complaints.length === 0 ? 'Student complaints will appear here as soon as they are filed.' : undefined} />
      ) : (
        <div className="max-w-2xl space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="ledger-card p-5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{c.subject}</p>
                <Ribbon tone={STATUS_TONE[c.status]}>{c.status.replace(/_/g, ' ')}</Ribbon>
              </div>
              <p className="mb-2 text-sm text-slate-600">{c.description}</p>
              <p className="mb-3 text-xs text-slate-400">
                <span className="font-data">{c.student.enrollmentNo}</span> · {c.student.user.email} · filed {new Date(c.createdAt).toLocaleString()}
              </p>

              <textarea
                placeholder="Write a response for the student..."
                value={responses[c.id] ?? c.response ?? ''}
                onChange={(e) => setResponses((prev) => ({ ...prev, [c.id]: e.target.value }))}
                rows={2}
                className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                {c.status !== 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleUpdate(c.id, 'IN_PROGRESS')}
                    className="rounded-md border border-yellow-500 px-3 py-1.5 text-sm font-medium text-yellow-600 transition hover:bg-yellow-50"
                  >
                    Mark In Progress
                  </button>
                )}
                <button
                  onClick={() => handleUpdate(c.id, 'RESOLVED')}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-700"
                >
                  Resolve & Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}