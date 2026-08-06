'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

export default function StudentFeedbackPage() {
  const { accessToken } = useAuth();
  const [sectionId, setSectionId] = useState('');
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/feedback', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ sectionId, rating, comments }),
      });
      setStatus('Feedback submitted — thank you.');
      setComments('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit feedback');
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Course Feedback</h1>
      <p className="mb-4 max-w-md text-sm text-slate-500">
        Your feedback is anonymous — teachers see the aggregate rating and comments, never who submitted them.
      </p>

      <div className="max-w-md space-y-3">
        <input
          placeholder="Section ID"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className={`h-9 w-9 rounded-md text-sm ${
                rating >= n ? 'bg-yellow-400 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          placeholder="Comments (optional)"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {status && <p className="text-sm text-green-600">{status}</p>}
        <button
          onClick={handleSubmit}
          disabled={!sectionId || rating === 0}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          Submit
        </button>
      </div>
    </main>
  );
}
