'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface ClearanceRequest {
  id: string;
  requestedAt: string;
  student: { enrollmentNo: string; user: { email: string } };
}

export default function LibrarianClearancesPage() {
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
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Pending Clearance Requests</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {requests.length === 0 && <p className="text-sm text-slate-500">No pending requests.</p>}

      <div className="max-w-lg space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="font-medium">{r.student.enrollmentNo}</p>
              <p className="text-xs text-slate-500">
                {r.student.user.email} · requested {new Date(r.requestedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => resolve(r.id, 'APPROVED')} className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white">
                Approve
              </button>
              <button onClick={() => resolve(r.id, 'REJECTED')} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
