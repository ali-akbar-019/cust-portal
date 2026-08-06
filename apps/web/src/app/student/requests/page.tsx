'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

type RequestType = 'TRANSCRIPT' | 'LETTER' | 'COURSE_WITHDRAW' | 'PERSONAL_INFO_CHANGE' | 'GENERAL';

interface RequestView {
  id: string;
  type: RequestType;
  details: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminRemarks: string | null;
  createdAt: string;
}

const STATUS_STYLE: Record<RequestView['status'], string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const TYPE_LABEL: Record<RequestType, string> = {
  TRANSCRIPT: 'Transcript',
  LETTER: 'Letter',
  COURSE_WITHDRAW: 'Course Withdraw',
  PERSONAL_INFO_CHANGE: 'Personal Info Change',
  GENERAL: 'General',
};

export default function StudentRequestsPage() {
  const { accessToken } = useAuth();
  const [type, setType] = useState<RequestType>('GENERAL');
  const [details, setDetails] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    // TODO: derive the student's own id from /students/me once that endpoint exists
    apiFetch<RequestView[]>('/requests/mine/PLACEHOLDER_STUDENT_ID', { token: accessToken })
      .then(setRequests)
      .catch(() => {});
  }

  useEffect(load, [accessToken]);

  async function handleSubmit() {
    setError(null);
    try {
      await apiFetch('/requests', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          type,
          details,
          ...(type === 'COURSE_WITHDRAW' ? { sectionId } : {}),
        }),
      });
      setDetails('');
      setSectionId('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit request');
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">My Requests</h1>

      <div className="mb-6 max-w-lg space-y-3 rounded-lg border border-slate-200 p-4">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as RequestType)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {Object.entries(TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {type === 'COURSE_WITHDRAW' && (
          <input
            placeholder="Section ID to withdraw from"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        )}
        <textarea
          placeholder="Details..."
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={handleSubmit} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Submit Request
        </button>
      </div>

      <div className="max-w-lg space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-medium">{TYPE_LABEL[r.type]}</p>
              <span className={`rounded px-2 py-1 text-xs ${STATUS_STYLE[r.status]}`}>{r.status}</span>
            </div>
            <p className="text-sm text-slate-600">{r.details}</p>
            {r.adminRemarks && (
              <p className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-700">
                <span className="font-medium">Remarks: </span>
                {r.adminRemarks}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
