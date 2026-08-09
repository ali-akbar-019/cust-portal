'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface AnnouncementView {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  postedBy: { email: string; role: string };
}

export default function TeacherNotificationsPage() {
  const { accessToken, profile } = useAuth();
  const [items, setItems] = useState<AnnouncementView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const params = new URLSearchParams();
    if (profile?.departmentId) params.set('departmentId', profile.departmentId);
    const qs = params.toString();
    apiFetch<AnnouncementView[]>(`/notifications${qs ? `?${qs}` : ''}`, { token: accessToken })
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load announcements'));
  }, [accessToken, profile]);

  if (error) return <main className="p-6 lg:p-10"><PageHeader title="Announcements" subtitle="Official notices from the administration" /><p className="text-sm text-red-600">{error}</p></main>;

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Notices Board"
        title="Announcements"
        subtitle="Official notices broadcast to faculty and your department."
      />

      {items.length === 0 ? (
        <EmptyState title="No announcements yet" hint="New notices from the administration will appear here." />
      ) : (
        <div className="max-w-2xl space-y-3">
          {items.map((a) => (
            <article key={a.id} className="ledger-card p-5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{a.title}</p>
                <Ribbon tone={a.postedBy.role === 'ADMIN' ? 'navy' : 'sapphire'}>{a.postedBy.role}</Ribbon>
              </div>
              <p className="mb-3 whitespace-pre-line text-sm text-slate-600">{a.message}</p>
              <p className="text-xs text-slate-400">Posted {new Date(a.createdAt).toLocaleString()} by {a.postedBy.email}</p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}