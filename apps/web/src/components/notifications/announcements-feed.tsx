'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';
import { isMarkedRead, markManyRead, markRead, readSetKey } from '@/lib/notification-reads';

interface AnnouncementView {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  postedBy: { email: string; role: string };
}

export function AnnouncementsFeed({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  const { accessToken, profile } = useAuth();
  const [items, setItems] = useState<AnnouncementView[]>([]);
  const [error, setError] = useState<string | null>(null);

  const readKey = readSetKey(profile?.userId);
  const refresh = () => setItems((prev) => [...prev]);
  const unreadCount = items.filter((a) => !isMarkedRead(readKey, a.id)).length;

  useEffect(() => {
    if (!accessToken) return;
    const params = new URLSearchParams();
    if (profile?.departmentId) params.set('departmentId', profile.departmentId);
    if (profile?.sectionId) params.set('sectionId', profile.sectionId);
    const qs = params.toString();
    apiFetch<AnnouncementView[]>(`/notifications${qs ? `?${qs}` : ''}`, { token: accessToken })
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load announcements'));
  }, [accessToken, profile]);

  if (error) return <main className="p-6 lg:p-10"><PageHeader title={title} subtitle={subtitle} /><p className="text-sm text-red-600">{error}</p></main>;

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        action={
          items.length > 0 ? (
            <button
              onClick={() => {
                markManyRead(readKey, items.map((a) => a.id));
                refresh();
              }}
              disabled={unreadCount === 0}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              {unreadCount === 0 ? 'All caught up' : `Mark all read (${unreadCount})`}
            </button>
          ) : undefined
        }
      />

      {items.length > 0 && (
        <div className="mb-6 flex items-center gap-2">
          <Ribbon tone={unreadCount > 0 ? 'crimson' : 'emerald'}>
            {unreadCount === 0 ? 'Everything read' : `${unreadCount} unread`}
          </Ribbon>
          <span className="text-xs text-slate-400">{items.length} total announcements</span>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="No announcements yet" hint="New notices from the administration and faculty will appear here." />
      ) : (
        <div className="max-w-2xl space-y-3">
          {items.map((a) => {
            const read = isMarkedRead(readKey, a.id);
            return (
              <button
                key={a.id}
                onClick={() => {
                  if (!isMarkedRead(readKey, a.id)) markRead(readKey, a.id);
                  refresh();
                }}
                className={`block w-full text-left transition ${read ? '' : 'rounded-md bg-blue-50/30'}`}
              >
                <article className={`ledger-card p-5 ${read ? 'opacity-85' : ''}`}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 font-medium text-slate-900">
                      <span className={`h-2 w-2 rounded-full ${read ? 'bg-slate-200' : 'bg-red-600'}`} aria-hidden />
                      {a.title}
                    </p>
                    <Ribbon tone={a.postedBy.role === 'ADMIN' ? 'navy' : 'sapphire'}>{a.postedBy.role}</Ribbon>
                  </div>
                  <p className="mb-3 whitespace-pre-line text-sm text-slate-600">{a.message}</p>
                  <p className="text-xs text-slate-400">Posted {new Date(a.createdAt).toLocaleString()} by {a.postedBy.email}</p>
                </article>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}