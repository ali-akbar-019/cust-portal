'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface ClearanceRequest {
  id: string;
  requestedAt: string;
  student: { enrollmentNo: string; user: { email: string } };
}

export default function AdminLibraryClearancePage() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    apiFetch<ClearanceRequest[]>('/library/clearance/pending', { token: accessToken })
      .then(setRequests)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load requests'));
  }

  useEffect(load, [accessToken]);

  async function resolve(id: string, status: 'APPROVED' | 'REJECTED') {
    try {
      await apiFetch(`/library/clearance/${id}/resolve`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ status }),
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resolve request');
    }
  }

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Library"
        title="Pending Library Clearances"
        subtitle="Students who have requested end-of-term clearance. Approving confirms they have no outstanding books or dues."
        action={<Ribbon tone="gold">{requests.length} pending</Ribbon>}
      />

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {requests.length === 0 ? (
        <EmptyState title="No pending requests" hint="The clearance queue is clear. New requests from students will appear here." />
      ) : (
        <div className="max-w-2xl space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="ledger-card flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="font-data font-medium text-slate-900">{r.student.enrollmentNo}</p>
                <p className="text-sm text-slate-500">{r.student.user.email}</p>
                <p className="mt-0.5 text-xs text-slate-400">Requested {new Date(r.requestedAt).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => resolve(r.id, 'APPROVED')}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                >
                  Approve Clearance
                </button>
                <button
                  onClick={() => resolve(r.id, 'REJECTED')}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}