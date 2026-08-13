'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';

interface MySection { id: string; course: { title: string; code: string }; teacher: { user: { email: string } } }
interface MyFeedback { rating: number; comments: string | null; submittedAt: string; section: { course: { title: string; code: string } } }
const card = 'rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm';
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5';

export default function StudentFeedbackPage() {
  const { accessToken, profile } = useAuth();
  const [sections, setSections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [history, setHistory] = useState<MyFeedback[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    Promise.all([
      apiFetch<MySection[]>(`/students/${profile.studentId}/sections`, { token: accessToken }),
      apiFetch<MyFeedback[]>(`/feedback/mine/${profile.studentId}`, { token: accessToken }),
    ])
      .then(([sectionData, feedbackData]) => {
        setSections(Array.isArray(sectionData) ? sectionData : []);
        setSectionId(sectionData[0]?.id ?? '');
        setHistory(Array.isArray(feedbackData) ? feedbackData : []);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load feedback'));
  }, [accessToken, profile?.studentId]);

  async function handleSubmit() {
    if (!accessToken || !sectionId || rating === 0 || submitting) return;
    setSubmitting(true);
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/feedback', { method: 'POST', token: accessToken, body: JSON.stringify({ sectionId, rating, comments: comments.trim() }) });
      setStatus('Feedback submitted. Thank you for helping improve the course experience.');
      setComments('');
      setRating(0);
      if (profile?.studentId) {
        const updated = await apiFetch<MyFeedback[]>(`/feedback/mine/${profile.studentId}`, { token: accessToken });
        setHistory(Array.isArray(updated) ? updated : []);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  }

  const outstanding = useMemo(() => Math.max(0, sections.length - history.length), [sections.length, history.length]);

  return (
    <main className="min-w-0 overflow-x-hidden bg-slate-50/50 p-4 sm:p-6 lg:p-8 xl:p-10">
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader eyebrow="Course Evaluation" title="Course Feedback" subtitle="Share an honest course evaluation. Responses are used as aggregate feedback for teaching improvement." />

        <div className="mb-7 mt-7 grid grid-cols-3 gap-3">
          {[['Courses', sections.length], ['Submitted', history.length], ['Outstanding', outstanding]].map(([label, value]) => (
            <div key={label} className={`${card} p-4 sm:p-5`}><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 font-data text-2xl font-semibold text-slate-900">{value}</p></div>
          ))}
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
          <section className={`${card} p-5 sm:p-6`}>
            <div className="mb-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Evaluation</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Review a course</h2></div>
            <div className="space-y-5">
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Course</span><select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={input}>{sections.length === 0 && <option value="">No enrolled courses</option>}{sections.map((section) => <option key={section.id} value={section.id}>{section.course.code} · {section.course.title}</option>)}</select></label>

              <div><span className="mb-2 block text-xs font-semibold text-slate-600">Overall rating</span><div className="flex items-center gap-1.5"><div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">{[1,2,3,4,5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} out of 5`} className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${rating >= n ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-white hover:text-slate-600'}`}>{n}</button>)}</div><span className="ml-1 text-xs text-slate-400">{rating ? `${rating}/5` : 'Select a rating'}</span></div></div>

              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Comments <span className="font-normal text-slate-400">(optional)</span></span><textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={6} placeholder="What is working well? What could be improved?" className={`${input} resize-y`} /></label>
              {(error || status) && <p className={`text-sm ${error ? 'text-red-600' : 'text-slate-600'}`}>{error ?? status}</p>}
              <button type="button" onClick={() => void handleSubmit()} disabled={!sectionId || rating === 0 || submitting} className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{submitting ? 'Submitting…' : 'Submit feedback'}</button>
              <p className="text-[11px] leading-5 text-slate-400">One response is stored per course. Submitting again updates your earlier response.</p>
            </div>
          </section>

          <section className="min-w-0"><div className="mb-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">History</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Submitted reviews</h2></div>{history.length === 0 ? <EmptyState title="No reviews submitted yet" hint="Your course evaluations will appear here after you submit them." /> : <div className="space-y-3">{history.map((item, index) => <article key={`${item.section.course.code}-${item.submittedAt}-${index}`} className={`${card} p-4 sm:p-5`}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="text-sm font-semibold text-slate-900">{item.section.course.title}</h3><p className="mt-1 font-data text-xs text-slate-400">{item.section.course.code} · {new Date(item.submittedAt).toLocaleDateString()}</p></div><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-data text-xs font-bold text-white">{item.rating}/5</div></div>{item.comments && <p className="mt-4 border-t border-slate-100 pt-3 text-sm leading-6 text-slate-500">{item.comments}</p>}</article>)}</div>}</section>
        </div>
      </div>
    </main>
  );
}
