'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';
import { useMarkManyRead, useIsMarkedRead } from '@/lib/notification-reads';

interface AnnouncementLite {
  id: string;
  title: string;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsPage() {
  const { accessToken, profile } = useAuth();
  const [unread, setUnread] = useState<AnnouncementLite[]>([]);
  const [read, setRead] = useState<AnnouncementLite[]>([]);
  const [open, setOpen] = useState<'unread' | 'read'>('unread');
  const [markedRead, setMarkedRead] = useState<Set<string>>(new Set());
  const [markAllPending, setMarkAllPending] = useState<boolean>(false);

  const readKey = useMarkManyRead(profile?.userId);

  useEffect(() => {
    if (!accessToken) return;
    const fetchAnnouncements = async () => {
      try {
        const data = await apiFetch<AnnouncementLite[]>(
          `/notifications?departmentId=${profile?.departmentId}`,
          { token: accessToken }
        );
        const readSet = useIsMarkedRead(readKey);

        const unreadItems = data.filter((a) => !readSet.has(a.id));
        const readItems = data.filter((a) => readSet.has(a.id));

        setUnread(unreadItems);
        setRead(readItems);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load notifications');
      }
    };
    fetchAnnouncements();
  }, [accessToken, profile, readKey]);

  useEffect(() => {
    if (markAllPending) {
      const ids = new Set(unread.map((a) => a.id));
      setMarkedRead(new Set([...markedRead, ...ids]));
      setMarkAllPending(false);
    }
  }, [markedRead, unread, markAllPending, setMarkedRead]);

  const handleMarkAllRead = () => {
    setMarkAllPending(true);
  };

  const totalUnread = unread.length;
  const totalRead = read.length;

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Notifications"
        title="Announcements"
        subtitle="Stay updated on course updates, grades, and system messages."
      />

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Ribbon tone="navy" className="text-[10px]">
            {totalUnread}
          </Ribbon>
          <span className="text-sm text-slate-500">Unread</span>
        </div>
        <div className="flex items-center gap-2">
          <Ribbon tone="muted" className="text-[10px]">
            {totalRead}
          </Ribbon>
          <span className="text-sm text-slate-500">Read</span>
        </div>
      </div>

      <div className="mb-4 rounded-md border border-slate-300 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            tabIndex={0}
            role="button"
            className={`flex-1 py-2 text-sm font-medium text-slate-700 border-b-2 border-b-navy bg-white transition-colors hover:bg-slate-50 ${open === 'unread' ? 'border-navy' : ''}`} onClick={() => setOpen('unread')}
          >
            Unread {unread.length > 0 ? <span className="ml-1 text-xs text-navy">({unread.length})</span> : ''}
          </button>
          <button
            tabIndex={1}
            role="button"
            className={`flex-1 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${open === 'read' ? 'border-navy' : ''}`} onClick={() => setOpen('read')}
          >
            Read {read.length > 0 ? <span className="ml-1 text-xs text-slate-500">({read.length})</span> : ''}
          </button>
        </div>
      </div>

      {!open === 'unread' ? (
        <div>
          {unread.length === 0 ? (
            <EmptyState
              title="No unread announcements"
              hint="You're all caught up — read announcements move out of the bell."
            )
          ) : (
            <div className="scroll-area max-h-80 overflow-y-auto">
              {unread.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {}}
                  className="flex w-full items-start gap-2.5 border-b border-blue-50 bg-blue-50/40 px-4 py-3 text-left transition last:border-b-0 hover:bg-blue-100/60"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{a.title}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(a.createdAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {read.length === 0 ? (
            <EmptyState
              title="No read announcements"
              hint="Announcements you've read will move out of the bell."
            )
          ) : (
            <div className="scroll-area max-h-80 overflow-y-auto">
              {read.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {}}
                  className="flex w-full items-start gap-2.5 border-b border-slate-200 bg-slate-50/50 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-100"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{a.title}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(a.createdAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={handleMarkAllRead}
            disabled={unread.length === 0}
            className="w-full py-2.5 text-left text-xs font-medium text-blue-600 underline disabled:text-slate-400 disabled:no-underline"
          >
            Mark all read
          </button>
        </div>
      )}

      <EmptyState
        title="No announcements yet"
        hint="You'll receive notifications for grades, assignments, and system updates."
      />
    </main>
  );
}