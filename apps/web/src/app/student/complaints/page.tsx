'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface ComplaintView {
  id: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  response: string | null;
  createdAt: string;
}

const STATUS_TONE: Record<ComplaintView['status'], 'crimson' | 'gold' | 'emerald'> = {
  OPEN: 'crimson',
  IN_PROGRESS: 'gold',
  RESOLVED: 'emerald',
};

export default function StudentComplaintsPage() {
  const { accessToken, profile } = useAuth();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [complaints, setComplaints] = useState<ComplaintView[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ComplaintView['status']>('ALL');
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<ComplaintView[]>(`/complaints/mine/${profile.studentId}`, { token: accessToken })
      .then(setComplaints)
      .catch(() => {});
  }

  useEffect(load, [accessToken, profile]);

  async function handleSubmit() {
    setError(null);
    try {
      await apiFetch('/complaints', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ subject, description }),
      });
      setSubject('');
      setDescription('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit complaint');
    }
  }

  const openCount = complaints.filter((c) => c.status === 'OPEN').length;
  const inProgressCount = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED').length;
  const filtered = statusFilter === 'ALL' ? complaints : complaints.filter((c) => c.status === statusFilter);

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Student Services"
        title="Complaints"
        subtitle="Raise a concern with the administration and track it until it is resolved."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Open</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{openCount}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">In progress</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{inProgressCount}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Resolved</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{resolvedCount}</p>
        </div>
      </div>

      <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">New Complaint</h2>
      <div className="ledger-card mb-8 max-w-lg space-y-3 p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Subject</span>
          <input
            placeholder="e.g. Library silent zone is too noisy"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Describe the issue</span>
          <textarea
            placeholder="Include as much detail as you can — what happened, where, and when."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={!subject.trim() || !description.trim()}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
        >
          Submit Complaint
        </button>
        <p className="text-xs text-slate-400">Complaints are usually acknowledged within 2–3 working days.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition ${
              statusFilter === s ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:text-slate-900'
            }`}
          >
            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ').toLowerCase()}
            {s !== 'ALL' && <span className="ml-1 opacity-70">{s === 'OPEN' ? openCount : s === 'IN_PROGRESS' ? inProgressCount : resolvedCount}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={complaints.length === 0 ? 'No complaints filed yet' : 'No complaints in this status'} hint={complaints.length === 0 ? 'Use the form above to raise a concern with the administration.' : undefined} />
      ) : (
        <div className="max-w-2xl space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="ledger-card p-5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{c.subject}</p>
                <Ribbon tone={STATUS_TONE[c.status]}>{c.status.replace(/_/g, ' ')}</Ribbon>
              </div>
              <p className="mb-2 text-sm text-slate-600">{c.description}</p>
              <p className="mb-3 text-xs text-slate-400">Filed {new Date(c.createdAt).toLocaleString()}</p>
              {c.response ? (
                <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">Administration response</p>
                  {c.response}
                </div>
              ) : (
                c.status !== 'RESOLVED' && <p className="text-xs text-slate-400">Awaiting a response from the administration.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}