'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface ComplaintView {
  id: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  response: string | null;
  createdAt: string;
}

const STATUS_STYLE: Record<ComplaintView['status'], string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
};

export default function StudentComplaintsPage() {
  const { accessToken } = useAuth();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [complaints, setComplaints] = useState<ComplaintView[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    // TODO: derive the student's own id from /students/me once that endpoint exists
    apiFetch<ComplaintView[]>('/complaints/mine/PLACEHOLDER_STUDENT_ID', { token: accessToken })
      .then(setComplaints)
      .catch(() => {});
  }

  useEffect(load, [accessToken]);

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

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Complaints</h1>

      <div className="mb-6 max-w-lg space-y-3 rounded-lg border border-slate-200 p-4">
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Describe your complaint..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={handleSubmit} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Submit
        </button>
      </div>

      <div className="max-w-lg space-y-3">
        {complaints.map((c) => (
          <div key={c.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-medium">{c.subject}</p>
              <span className={`rounded px-2 py-1 text-xs ${STATUS_STYLE[c.status]}`}>{c.status}</span>
            </div>
            <p className="text-sm text-slate-600">{c.description}</p>
            {c.response && (
              <p className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-700">
                <span className="font-medium">Response: </span>
                {c.response}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
