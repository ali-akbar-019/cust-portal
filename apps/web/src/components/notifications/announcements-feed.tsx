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
  const [showRead, setShowRead] = useState(false);

  const readKey = readSetKey(profile?.userId);
  const refresh = () => setItems((prev) => [...prev]);
  const unreadList = items.filter((a) => !isMarkedRead(readKey, a.id));
  const readList = items.filter((a) => isMarkedRead(readKey, a.id));

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
          unreadList.length > 0 ? (
            <button
              onClick={() => {
                markManyRead(readKey, unreadList.map((a) => a.id));
                refresh();
              }}
              disabled={unreadList.length === 0}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              Mark all read ({unreadList.length})
            </button>
          ) : undefined
        }
      />

      {items.length > 0 && (
        <div className="mb-6 flex items-center gap-2">
          <Ribbon tone={unreadList.length > 0 ? 'crimson' : 'emerald'}>
            {unreadList.length === 0 ? 'Everything read' : `${unreadList.length} unread`}
          </Ribbon>
          <span className="text-xs text-slate-400">
            Read notices are moved out of this list — find them again below.
          </span>
        </div>
      )}

      {unreadList.length > 0 ? (
        <div className="max-w-2xl space-y-3">
          {unreadList.map((a) => (
            <button key={a.id} onClick={() => { markRead(readKey, a.id); refresh(); }} className="block w-full text-left">
              <article className="rounded-lg border border-blue-200 bg-blue-50/40 p-5 text-left transition hover:bg-blue-50">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-medium text-slate-900">
                    <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden />
                    {a.title}
                  </p>
                  <Ribbon tone={a.postedBy.role === 'ADMIN' ? 'navy' : 'sapphire'}>{a.postedBy.role}</Ribbon>
                </div>
                <p className="mb-3 whitespace-pre-line text-sm text-slate-600">{a.message}</p>
                <p className="text-xs text-slate-400">Posted {new Date(a.createdAt).toLocaleString()} by {a.postedBy.email}</p>
              </article>
            </button>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No announcements yet" hint="New notices from the administration and faculty will appear here." />
      ) : (
        <EmptyState title="You\u2019re all caught up" hint="Everything in your inbox has been read. New announcements will show up here, and older ones can be reopened below." />
      )}

      {readList.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowRead((s) => !s)}
            className="mb-3 text-sm font-medium text-blue-600 underline"
          >
            {showRead ? 'Hide' : 'Show'} previously read ({readList.length})
          </button>
          {showRead && (
            <div className="max-w-2xl space-y-3 opacity-70">
              {readList.map((a) => (
                <article key={a.id} className="ledger-card p-5">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 font-medium text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-slate-200" aria-hidden />
                      {a.title}
                    </p>
                    <Ribbon tone={a.postedBy.role === 'ADMIN' ? 'navy' : 'sapphire'}>{a.postedBy.role}</Ribbon>
                  </div>
                  <p className="mb-3 whitespace-pre-line text-sm text-slate-500">{a.message}</p>
                  <p className="text-xs text-slate-400">Posted {new Date(a.createdAt).toLocaleString()} by {a.postedBy.email}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}