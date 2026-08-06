'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface ComplaintView {
  id: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  student: { enrollmentNo: string; user: { email: string } };
}

export default function AdminComplaintsPage() {
  const { accessToken } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintView[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    apiFetch<ComplaintView[]>('/complaints', { token: accessToken })
      .then(setComplaints)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load complaints'));
  }

  useEffect(load, [accessToken]);

  async function handleUpdate(id: string, status: ComplaintView['status']) {
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

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Complaints Triage</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="max-w-2xl space-y-4">
        {complaints.map((c) => (
          <div key={c.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-medium">{c.subject}</p>
              <span className="text-xs text-slate-400">{c.status}</span>
            </div>
            <p className="mb-2 text-sm text-slate-600">{c.description}</p>
            <p className="mb-2 text-xs text-slate-400">
              {c.student.enrollmentNo} · {c.student.user.email}
            </p>
            <textarea
              placeholder="Write a response..."
              value={responses[c.id] ?? ''}
              onChange={(e) => setResponses((prev) => ({ ...prev, [c.id]: e.target.value }))}
              rows={2}
              className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleUpdate(c.id, 'IN_PROGRESS')}
                className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm text-white"
              >
                Mark In Progress
              </button>
              <button
                onClick={() => handleUpdate(c.id, 'RESOLVED')}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white"
              >
                Resolve
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
