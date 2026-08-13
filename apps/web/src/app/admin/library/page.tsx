'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { AdminButton, AdminMessage, AdminPill, AdminSectionHeading, AdminStat, AdminSurface } from '../_components/admin-ui';

interface ClearanceRequest { id: string; requestedAt: string; student: { enrollmentNo: string; user: { email: string } }; }

export default function AdminLibraryClearancePage() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    setError(null);
    apiFetch<ClearanceRequest[]>('/library/clearance/pending', { token: accessToken })
      .then(setRequests)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load requests'));
  }
  useEffect(load, [accessToken]);

  async function resolve(id: string, status: 'APPROVED' | 'REJECTED') {
    setError(null); setSavingId(id);
    try {
      await apiFetch(`/library/clearance/${id}/resolve`, { method: 'POST', token: accessToken, body: JSON.stringify({ status }) });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resolve request');
    } finally { setSavingId(null); }
  }

  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">
      <PageHeader eyebrow="Library" title="Pending Library Clearances" subtitle="Review end-of-term clearance requests before approving the student's library status." />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AdminStat label="Pending" value={requests.length} detail="Awaiting review" />
        <AdminStat label="Queue" value={requests.length ? 'Active' : 'Clear'} />
      </div>

      {error && <div className="mb-5"><AdminMessage tone="error">{error}</AdminMessage></div>}

      <AdminSectionHeading title="Clearance queue" subtitle={`${requests.length} pending request${requests.length === 1 ? '' : 's'}`} />
      {requests.length === 0 ? (
        <EmptyState title="No pending requests" hint="The clearance queue is clear. New student requests will appear here." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {requests.map((r) => (
            <AdminSurface key={r.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-data text-sm font-semibold text-slate-950">{r.student.enrollmentNo}</p>
                    <AdminPill tone="warning">Pending</AdminPill>
                  </div>
                  <p className="mt-2 truncate text-sm text-slate-500">{r.student.user.email}</p>
                  <p className="mt-1 text-xs text-slate-400">Requested {new Date(r.requestedAt).toLocaleString()}</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-40">
                  <AdminButton disabled={savingId === r.id} onClick={() => resolve(r.id, 'APPROVED')} className="w-full">{savingId === r.id ? 'Saving…' : 'Approve clearance'}</AdminButton>
                  <AdminButton variant="secondary" disabled={savingId === r.id} onClick={() => resolve(r.id, 'REJECTED')} className="w-full">Reject</AdminButton>
                </div>
              </div>
            </AdminSurface>
          ))}
        </div>
      )}
    </main>
  );
}
