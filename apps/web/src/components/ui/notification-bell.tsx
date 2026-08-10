'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { isMarkedRead, markManyRead, markRead, readSetKey } from '@/lib/notification-reads';

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

export function NotificationBell({ href }: { href: string }) {
  const { accessToken, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AnnouncementLite[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const readKey = readSetKey(profile?.userId);
  // Once read, an announcement leaves the bell — the unread list is the
  // only thing shown here; the archive lives on the notifications page.
  const unread = items.filter((a) => !isMarkedRead(readKey, a.id));
  const recent = unread.slice(0, 5);

  useEffect(() => {
    if (!accessToken) return;
    const params = new URLSearchParams();
    if (profile?.departmentId) params.set('departmentId', profile.departmentId);
    if (profile?.sectionId) params.set('sectionId', profile.sectionId);
    const qs = params.toString();
    apiFetch<AnnouncementLite[]>(`/notifications${qs ? `?${qs}` : ''}`, { token: accessToken })
      .then(setItems)
      .catch(() => {});
  }, [accessToken, profile]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleMarkAll() {
    markManyRead(readKey, unread.map((a) => a.id));
    setItems([...items]);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Announcements"
        className="relative rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {recent.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
            {recent.length > 99 ? '99+' : recent.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Announcements</p>
            <div className="flex items-center gap-3">
              {recent.length > 0 && <span className="text-[11px] text-slate-400">{recent.length} unread</span>}
              <button
                onClick={handleMarkAll}
                disabled={recent.length === 0}
                className="text-[11px] font-medium text-blue-600 underline disabled:text-slate-400 disabled:no-underline"
              >
                Mark all read
              </button>
            </div>
          </div>
          <div className="scroll-area max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-400">
                {items.length === 0 ? 'No announcements yet.' : 'You\u2019re all caught up — read announcements move out of the bell.'}
              </p>
            ) : (
              recent.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    markRead(readKey, a.id);
                    setItems([...items]);
                  }}
                  className="flex w-full items-start gap-2.5 border-b border-blue-50 bg-blue-50/40 px-4 py-3 text-left transition last:border-b-0 hover:bg-blue-100/60"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{a.title}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(a.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          <Link
            href={href}
            onClick={() => setOpen(false)}
            className="block border-t border-slate-200 px-4 py-2.5 text-center text-xs font-medium text-blue-600 hover:bg-slate-50"
          >
            View all announcements
          </Link>
        </div>
      )}
    </div>
  );
}