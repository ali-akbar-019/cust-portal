'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';

type RequestType = 'TRANSCRIPT' | 'LETTER' | 'COURSE_WITHDRAW' | 'PERSONAL_INFO_CHANGE' | 'GENERAL';
type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
interface RequestView { id: string; type: RequestType; details: string; status: RequestStatus; adminRemarks: string | null; createdAt: string }
interface MySection { id: string; course: { title: string; code: string } }
const card = 'rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm';
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5';
const TYPE_LABEL: Record<RequestType, string> = { TRANSCRIPT: 'Transcript', LETTER: 'Letter', COURSE_WITHDRAW: 'Course withdraw', PERSONAL_INFO_CHANGE: 'Personal information change', GENERAL: 'General' };
const TYPE_HINT: Record<RequestType, string> = { TRANSCRIPT: 'Official copy of your academic record', LETTER: 'Enrollment or character certificate', COURSE_WITHDRAW: 'Drop one of your enrolled courses', PERSONAL_INFO_CHANGE: 'Update personal information on record', GENERAL: 'Other administrative request' };
const STATUS_LABEL: Record<RequestStatus, string> = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };

export default function StudentRequestsPage() {
  const { accessToken, profile } = useAuth();
  const [type, setType] = useState<RequestType>('GENERAL');
  const [details, setDetails] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [mySections, setMySections] = useState<MySection[]>([]);
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadRequests() {
    if (!accessToken || !profile?.studentId) return;
    const data = await apiFetch<RequestView[]>(`/requests/mine/${profile.studentId}`, { token: accessToken });
    setRequests(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    Promise.all([
      apiFetch<RequestView[]>(`/requests/mine/${profile.studentId}`, { token: accessToken }),
      apiFetch<MySection[]>(`/students/${profile.studentId}/sections`, { token: accessToken }),
    ])
      .then(([requestData, sectionData]) => {
        setRequests(Array.isArray(requestData) ? requestData : []);
        setMySections(Array.isArray(sectionData) ? sectionData : []);
        setSectionId(sectionData[0]?.id ?? '');
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load requests'));
  }, [accessToken, profile?.studentId]);

  async function handleSubmit() {
    if (!accessToken || !details.trim() || submitting || (type === 'COURSE_WITHDRAW' && !sectionId)) return;
    setSubmitting(true); setError(null); setNotice(null);
    try {
      await apiFetch('/requests', { method: 'POST', token: accessToken, body: JSON.stringify({ type, details: details.trim(), ...(type === 'COURSE_WITHDRAW' ? { sectionId } : {}) }) });
      setDetails('');
      setNotice('Your request has been submitted successfully.');
      await loadRequests();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to submit request'); }
    finally { setSubmitting(false); }
  }

  const pending = useMemo(() => requests.filter((request) => request.status === 'PENDING').length, [requests]);
  const approved = useMemo(() => requests.filter((request) => request.status === 'APPROVED').length, [requests]);

  return (
    <main className="min-w-0 overflow-x-hidden bg-slate-50/50 p-4 sm:p-6 lg:p-8 xl:p-10">
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader eyebrow="Registrar Office" title="My Requests" subtitle="Submit administrative requests and track their status without leaving the portal." />

        <div className="mb-7 mt-7 grid grid-cols-3 gap-3">{[['Total', requests.length], ['Pending', pending], ['Approved', approved]].map(([label, value]) => <div key={label} className={`${card} p-4 sm:p-5`}><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 font-data text-2xl font-semibold text-slate-900">{value}</p></div>)}</div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
          <section className={`${card} p-5 sm:p-6`}>
            <div className="mb-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">New request</p><h2 className="mt-1 text-lg font-semibold text-slate-900">File a request</h2></div>
            <div className="space-y-4">
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Request type</span><select value={type} onChange={(e) => setType(e.target.value as RequestType)} className={input}>{Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="mt-1.5 block text-[11px] leading-5 text-slate-400">{TYPE_HINT[type]}</span></label>
              {type === 'COURSE_WITHDRAW' && <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Course</span><select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={input}>{mySections.length === 0 && <option value="">No enrolled courses</option>}{mySections.map((section) => <option key={section.id} value={section.id}>{section.course.code} · {section.course.title}</option>)}</select></label>}
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Details</span><textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={6} placeholder="Explain what you need and include any supporting information..." className={`${input} resize-y`} /></label>
              {(error || notice) && <p className={`text-sm ${error ? 'text-red-600' : 'text-slate-600'}`}>{error ?? notice}</p>}
              <button type="button" onClick={() => void handleSubmit()} disabled={!details.trim() || submitting || (type === 'COURSE_WITHDRAW' && !sectionId)} className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{submitting ? 'Submitting…' : 'Submit request'}</button>
            </div>
          </section>

          <section className="min-w-0"><div className="mb-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">History</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Submitted requests</h2></div>{requests.length === 0 ? <EmptyState title="No requests on file" hint="Your submitted requests and their status will appear here." /> : <div className="space-y-3">{requests.map((request) => <article key={request.id} className={`${card} p-4 sm:p-5`}><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="text-sm font-semibold text-slate-900 sm:text-base">{TYPE_LABEL[request.type]}</h3><p className="mt-1 text-[11px] text-slate-400">{TYPE_HINT[request.type]} · Filed {new Date(request.createdAt).toLocaleDateString()}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${request.status === 'APPROVED' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{STATUS_LABEL[request.status]}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{request.details}</p>{request.adminRemarks && <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Administration remarks</p><p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{request.adminRemarks}</p></div>}</article>)}</div>}</section>
        </div>
      </div>
    </main>
  );
}
