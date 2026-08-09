'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';

interface MySection {
  id: string;
  course: { title: string; code: string };
  enrolledCount: number;
}
interface FeedbackSummary {
  count: number;
  average: number | null;
  comments: (string | null)[];
}

export default function TeacherFeedbackPage() {
  const { accessToken, profile } = useAuth();
  const [sections, setSections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!accessToken || !profile?.teacherId) return;
    apiFetch<MySection[]>(`/teachers/${profile.teacherId}/sections`, { token: accessToken })
      .then((s) => {
        setSections(s);
        if (s.length > 0) setSectionId(s[0]?.id ?? '');
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, profile]);

  async function load() {
    if (!sectionId) return;
    setError(null);
    setIsLoading(true);
    try {
      const data = await apiFetch<FeedbackSummary>(`/feedback/section/${sectionId}`, { token: accessToken });
      setSummary(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load feedback');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const current = sections.find((s) => s.id === sectionId);

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Course Evaluation"
        title="Section Feedback"
        subtitle="Anonymized responses from the students in each of your sections — you see the averages and comments, never who wrote them."
      />

      <label className="mb-6 flex max-w-md items-center gap-2">
        <span className="shrink-0 text-sm font-medium text-slate-700">Section</span>
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {sections.length === 0 && <option value="">No sections assigned</option>}
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.course.title} ({s.course.code}) · {s.enrolledCount} students
            </option>
          ))}
        </select>
      </label>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {isLoading && <p className="text-sm text-slate-500">Loading feedback…</p>}

      {summary && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="ledger-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Course</p>
              <p className="mt-1 font-serif text-lg font-semibold text-slate-900">
                {current ? `${current.course.title} (${current.course.code})` : '—'}
              </p>
            </div>
            <div className="ledger-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Average rating</p>
              <p className="mt-1 font-serif text-4xl font-semibold text-slate-900">
                {summary.average ?? '—'}
                <span className="text-base font-normal text-slate-400"> / 5</span>
              </p>
            </div>
            <div className="ledger-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Responses</p>
              <p className="mt-1 font-serif text-4xl font-semibold text-slate-900">{summary.count}</p>
            </div>
          </div>

          {summary.average !== null && (
            <div className="mb-6 max-w-md">
              <div className="mb-1 flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-700">Satisfaction</span>
                <span className="font-data text-slate-500">{summary.average}/5</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${summary.average >= 4 ? 'bg-green-600' : summary.average >= 3 ? 'bg-yellow-500' : 'bg-red-600'}`}
                  style={{ width: `${(summary.average / 5) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {summary.average >= 4 ? 'Strong satisfaction — keep doing what you are doing.' : summary.average >= 3 ? 'Generally positive with room to improve.' : 'Students are dissatisfied — consider reviewing your approach.'}
              </p>
            </div>
          )}

          {summary.comments.length === 0 && summary.count > 0 ? (
            <EmptyState title="Responses received, no comments" hint="Students rated the course but left no written feedback." />
          ) : summary.count === 0 ? (
            <EmptyState title="No feedback yet" hint="Students will be able to review this section once they have attended a few classes." />
          ) : (
            <>
              <p className="mb-3 font-serif text-base font-semibold text-slate-900">
                Student comments <span className="text-sm font-normal text-slate-400">(anonymized)</span>
              </p>
              <div className="max-w-2xl space-y-2">
                {summary.comments.map((c, i) => (
                  <blockquote key={i} className="ledger-card border-l-4 border-l-slate-200 p-4 text-sm text-slate-600">
                    “{c}”
                  </blockquote>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}