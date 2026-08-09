'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

type RequestType = 'TRANSCRIPT' | 'LETTER' | 'COURSE_WITHDRAW' | 'PERSONAL_INFO_CHANGE' | 'GENERAL';

interface RequestView {
  id: string;
  type: RequestType;
  details: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminRemarks: string | null;
  createdAt: string;
}

interface MySection {
  id: string;
  course: { title: string; code: string };
}

const STATUS_TONE: Record<RequestView['status'], 'muted' | 'emerald' | 'crimson'> = {
  PENDING: 'muted',
  APPROVED: 'emerald',
  REJECTED: 'crimson',
};

const TYPE_LABEL: Record<RequestType, string> = {
  TRANSCRIPT: 'Transcript',
  LETTER: 'Letter',
  COURSE_WITHDRAW: 'Course Withdraw',
  PERSONAL_INFO_CHANGE: 'Personal Info Change',
  GENERAL: 'General',
};

const TYPE_HINT: Record<RequestType, string> = {
  TRANSCRIPT: 'Official copy of your academic record',
  LETTER: 'Letter of enrollment / character certificate',
  COURSE_WITHDRAW: 'Drop one of your enrolled courses',
  PERSONAL_INFO_CHANGE: 'Update your personal information on record',
  GENERAL: 'Any other administrative request',
};

export default function StudentRequestsPage() {
  const { accessToken, profile } = useAuth();
  const [type, setType] = useState<RequestType>('GENERAL');
  const [details, setDetails] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [mySections, setMySections] = useState<MySection[]>([]);
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<RequestView[]>(`/requests/mine/${profile.studentId}`, { token: accessToken })
      .then(setRequests)
      .catch(() => {});
  }

  useEffect(load, [accessToken, profile]);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<MySection[]>(`/students/${profile.studentId}/sections`, { token: accessToken })
      .then((sections) => {
        setMySections(sections);
        if (sections.length > 0) setSectionId(sections[0]?.id ?? '');
      })
      .catch(() => {});
  }, [accessToken, profile]);

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
      setSectionId(mySections[0]?.id ?? '');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit request');
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Registrar Office"
        title="My Requests"
        subtitle="Request official documents or administrative actions — transcripts, letters, course drops and more."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total filed</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{requests.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pending</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{pendingCount}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Approved</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{requests.filter((r) => r.status === 'APPROVED').length}</p>
        </div>
      </div>

      <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">File a New Request</h2>
      <div className="ledger-card mb-8 max-w-lg space-y-3 p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Request type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RequestType)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label} — {TYPE_HINT[value as RequestType]}
              </option>
            ))}
          </select>
        </label>

        {type === 'COURSE_WITHDRAW' && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Course to withdraw from</span>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {mySections.length === 0 && <option value="">No enrolled courses</option>}
              {mySections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.course.title} ({s.course.code})
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-400">Approved withdrawals free the seat in that section.</span>
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Details</span>
          <textarea
            placeholder="Explain what you need and any supporting information..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={!details.trim()}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
        >
          Submit Request
        </button>
      </div>

      {requests.length === 0 ? (
        <EmptyState title="No requests on file" hint="Your submitted requests and their status will appear here." />
      ) : (
        <div className="max-w-2xl space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="ledger-card p-5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{TYPE_LABEL[r.type]}</p>
                <Ribbon tone={STATUS_TONE[r.status]}>{r.status}</Ribbon>
              </div>
              {typeHintLine(r.type)}
              <p className="mb-2 text-sm text-slate-600">{r.details}</p>
              <p className="mb-3 text-xs text-slate-400">Filed {new Date(r.createdAt).toLocaleString()}</p>
              {r.adminRemarks && (
                <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">Administration remarks</p>
                  {r.adminRemarks}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function typeHintLine(type: RequestType) {
  return <p className="text-xs text-slate-400">{TYPE_HINT[type]}</p>;
}