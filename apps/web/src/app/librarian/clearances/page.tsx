'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface ClearanceRequest {
  id: string;
  requestedAt: string;
  student: { enrollmentNo: string; user: { email: string } };
}

type ResolveStatus = 'APPROVED' | 'REJECTED';

export default function LibrarianClearancesPage() {
  const { accessToken, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!accessToken) {
      setRequests([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<ClearanceRequest[]>('/library/clearance/pending', { token: accessToken });
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load clearance requests.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!authLoading) void loadRequests();
  }, [authLoading, loadRequests]);

  async function resolve(id: string, nextStatus: ResolveStatus) {
    if (!accessToken || resolvingId) return;
    try {
      setResolvingId(id);
      setError(null);
      setStatus(null);
      await apiFetch(`/library/clearance/${id}/resolve`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ status: nextStatus }),
      });
      setRequests((current) => current.filter((request) => request.id !== id));
      setStatus(`Clearance request ${nextStatus === 'APPROVED' ? 'approved' : 'rejected'} successfully.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resolve the clearance request.');
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <main className="w-full min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
      <PageHeader
        eyebrow="Library"
        title="Pending Clearance Requests"
        subtitle="Review students requesting end-of-term library clearance."
        action={<Ribbon tone="gold">{requests.length} pending</Ribbon>}
      />

      {status && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p>}
      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="max-w-3xl space-y-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />)}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState title="No pending requests" hint="The clearance queue is clear. New student requests will appear here." />
      ) : (
        <div className="grid max-w-4xl gap-3">
          {requests.map((request) => {
            const busy = resolvingId === request.id;
            const requestedDate = new Date(request.requestedAt);
            const requestedLabel = Number.isNaN(requestedDate.getTime()) ? request.requestedAt : requestedDate.toLocaleString();
            return (
              <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-data text-sm font-semibold text-slate-900">{request.student.enrollmentNo}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{request.student.user.email}</p>
                    <p className="mt-1 text-xs text-slate-400">Requested {requestedLabel}</p>
                  </div>
                  <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                    <button type="button" disabled={busy} onClick={() => resolve(request.id, 'APPROVED')} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">{busy ? 'Processing…' : 'Approve'}</button>
                    <button type="button" disabled={busy} onClick={() => resolve(request.id, 'REJECTED')} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">Reject</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
