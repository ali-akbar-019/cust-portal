'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface MySection {
  id: string;
  course: { title: string; code: string };
  teacher: { user: { email: string } };
}
interface MyFeedback {
  rating: number;
  comments: string | null;
  submittedAt: string;
  section: { course: { title: string; code: string } };
}

export default function StudentFeedbackPage() {
  const { accessToken, profile } = useAuth();
  const [sections, setSections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [history, setHistory] = useState<MyFeedback[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<MySection[]>(`/students/${profile.studentId}/sections`, { token: accessToken })
      .then((s) => {
        setSections(s);
        if (s.length > 0) setSectionId(s[0]?.id ?? '');
      })
      .catch(() => {});
    apiFetch<MyFeedback[]>(`/feedback/mine/${profile.studentId}`, { token: accessToken })
      .then(setHistory)
      .catch(() => {});
  }, [accessToken, profile]);

  async function handleSubmit() {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/feedback', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ sectionId, rating, comments }),
      });
      setStatus('Feedback submitted — thank you. Resubmitting updates your earlier response.');
      setComments('');
      setRating(0);
      if (profile?.studentId) {
        apiFetch<MyFeedback[]>(`/feedback/mine/${profile.studentId}`, { token: accessToken }).then(setHistory).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit feedback');
    }
  }

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Course Evaluation"
        title="Course Feedback"
        subtitle="Tell us how each course is going. Your feedback is anonymous — teachers only ever see the aggregate rating and comments."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Courses to evaluate</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{sections.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Reviews submitted</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{history.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Outstanding</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{sections.length - history.length}</p>
        </div>
      </div>

      <div className="ledger-card mb-8 max-w-lg space-y-4 p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Course</span>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {sections.length === 0 && <option value="">No enrolled courses yet</option>}
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.course.title} ({s.course.code})
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Overall rating</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                aria-label={`${n} out of 5 stars`}
                className={`h-10 w-10 rounded-md text-lg transition ${
                  rating >= n ? 'bg-yellow-400 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
              >
                ★
              </button>
            ))}
            <span className="ml-2 self-center text-sm text-slate-500">{rating > 0 ? `${rating}/5` : 'Tap to rate'}</span>
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Comments (optional)</span>
          <textarea
            placeholder="What's working well? What could be improved?"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {status && <p className="text-sm text-green-700">{status}</p>}
        <button
          onClick={handleSubmit}
          disabled={!sectionId || rating === 0}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
        >
          Submit Feedback
        </button>
        <p className="text-xs text-slate-400">One review per course — resubmitting updates your earlier response instead of creating a duplicate.</p>
      </div>

      {history.length > 0 && (
        <>
          <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">My Submitted Reviews</h2>
          <div className="max-w-lg space-y-2">
            {history.map((h, i) => (
              <div key={i} className="ledger-card flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium text-slate-900">{h.section.course.title}</p>
                  <p className="font-data text-xs text-slate-500">{h.section.course.code} · {new Date(h.submittedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Ribbon tone={h.rating >= 4 ? 'emerald' : h.rating >= 3 ? 'gold' : 'crimson'}>{h.rating}/5</Ribbon>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}