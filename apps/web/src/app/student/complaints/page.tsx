'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';

interface ComplaintView {
  id: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  response: string | null;
  createdAt: string;
}

const card = 'rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm';
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5';

const STATUS_LABEL: Record<ComplaintView['status'], string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
};

export default function StudentComplaintsPage() {
  const { accessToken, profile } = useAuth();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [complaints, setComplaints] = useState<ComplaintView[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ComplaintView['status']>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<ComplaintView[]>(`/complaints/mine/${profile.studentId}`, { token: accessToken })
      .then((data) => setComplaints(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load complaints'));
  }, [accessToken, profile?.studentId]);

  async function handleSubmit() {
    if (!accessToken || !subject.trim() || !description.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/complaints', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ subject: subject.trim(), description: description.trim() }),
      });
      setSubject('');
      setDescription('');
      setNotice('Your complaint has been submitted successfully.');
      const data = await apiFetch<ComplaintView[]>(`/complaints/mine/${profile?.studentId}`, { token: accessToken });
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  }

  const counts = useMemo(() => ({
    open: complaints.filter((c) => c.status === 'OPEN').length,
    progress: complaints.filter((c) => c.status === 'IN_PROGRESS').length,
    resolved: complaints.filter((c) => c.status === 'RESOLVED').length,
  }), [complaints]);

  const filtered = statusFilter === 'ALL' ? complaints : complaints.filter((c) => c.status === statusFilter);

  return (
    <main className="min-w-0 overflow-x-hidden bg-slate-50/50 p-4 sm:p-6 lg:p-8 xl:p-10">
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader eyebrow="Student Services" title="Complaints" subtitle="Raise a concern with the administration and track its progress from submission to resolution." />

        <div className="mb-7 mt-7 grid grid-cols-3 gap-3">
          {[['Open', counts.open], ['In progress', counts.progress], ['Resolved', counts.resolved]].map(([label, value]) => (
            <div key={label} className={`${card} p-4 sm:p-5`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
              <p className="mt-2 font-data text-2xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
          <section className={`${card} p-5 sm:p-6`}>
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">New case</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Submit a complaint</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">Include what happened, where it happened, and when possible.</p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Subject</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short description of the issue" className={input} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Description</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the issue in detail..." rows={6} className={`${input} resize-y`} />
              </label>

              {(error || notice) && <p className={`text-sm ${error ? 'text-red-600' : 'text-slate-600'}`}>{error ?? notice}</p>}

              <button type="button" onClick={() => void handleSubmit()} disabled={!subject.trim() || !description.trim() || submitting} className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
                {submitting ? 'Submitting…' : 'Submit complaint'}
              </button>

              <p className="text-[11px] leading-5 text-slate-400">Complaints are normally acknowledged within 2–3 working days.</p>
            </div>
          </section>

          <section className="min-w-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">History</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Your complaints</h2>
              </div>
              <div className="flex shrink-0 gap-1 rounded-xl border border-slate-200 bg-white p-1">
                {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((value) => (
                  <button key={value} type="button" onClick={() => setStatusFilter(value)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition sm:px-3 ${statusFilter === value ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                    {value === 'ALL' ? 'All' : STATUS_LABEL[value]}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState title={complaints.length === 0 ? 'No complaints filed yet' : 'No complaints in this status'} hint={complaints.length === 0 ? 'Your submitted complaints will appear here.' : undefined} />
            ) : (
              <div className="space-y-3">
                {filtered.map((complaint) => (
                  <article key={complaint.id} className={`${card} p-4 sm:p-5`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{complaint.subject}</h3>
                        <p className="mt-1 text-[11px] text-slate-400">Filed {new Date(complaint.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{STATUS_LABEL[complaint.status]}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{complaint.description}</p>
                    {complaint.response ? (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Administration response</p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{complaint.response}</p>
                      </div>
                    ) : complaint.status !== 'RESOLVED' ? (
                      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">Awaiting a response from the administration.</p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
