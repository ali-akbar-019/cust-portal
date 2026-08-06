'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface RequestView {
  id: string;
  type: string;
  details: string;
  status: string;
  student: { enrollmentNo: string; user: { email: string } };
}

export default function AdminRequestsPage() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
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

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Requests Triage</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="max-w-2xl space-y-4">
        {requests.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-medium">{r.type.replace(/_/g, ' ')}</p>
              <span className="text-xs text-slate-400">{r.status}</span>
            </div>
            <p className="mb-2 text-sm text-slate-600">{r.details}</p>
            <p className="mb-2 text-xs text-slate-400">
              {r.student.enrollmentNo} · {r.student.user.email}
            </p>
            {r.status === 'PENDING' && (
              <>
                <textarea
                  placeholder="Remarks (optional)"
                  value={remarks[r.id] ?? ''}
                  onChange={(e) => setRemarks((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  rows={2}
                  className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => resolve(r.id, 'APPROVED')}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => resolve(r.id, 'REJECTED')}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white"
                  >
                    Reject
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
