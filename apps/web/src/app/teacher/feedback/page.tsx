'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface FeedbackSummary {
  count: number;
  average: number | null;
  comments: (string | null)[];
}

export default function TeacherFeedbackPage() {
  const { accessToken } = useAuth();
  const [sectionId, setSectionId] = useState('');
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!sectionId) return;
    setError(null);
    try {
      const data = await apiFetch<FeedbackSummary>(`/feedback/section/${sectionId}`, { token: accessToken });
      setSummary(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load feedback');
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Section Feedback</h1>

      <div className="mb-6 flex max-w-md gap-2">
        <input
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          placeholder="Section ID"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button onClick={load} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Load
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {summary && (
        <div className="max-w-md">
          <div className="mb-4 rounded-lg border border-slate-200 p-4">
            <p className="text-3xl font-semibold">{summary.average ?? '—'} / 5</p>
            <p className="text-sm text-slate-500">{summary.count} response(s)</p>
          </div>
          {summary.comments.length > 0 && (
            <div className="space-y-2">
              {summary.comments.map((c, i) => (
                <p key={i} className="rounded bg-slate-50 p-2 text-sm text-slate-700">
                  {c}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
