'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, ChevronRight } from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import {
  isMarkedRead,
  markManyRead,
  markRead,
  readSetKey,
} from '@/lib/notification-reads';

interface AnnouncementLite {
  id: string;
  title: string;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const timestamp = new Date(iso).getTime();

  if (!Number.isFinite(timestamp)) {
    return '';
  }

  const diff = Date.now() - timestamp;

  if (diff < 0) {
    return 'just now';
  }

  const mins = Math.floor(diff / 60000);

  if (mins < 1) {
    return 'just now';
  }

  if (mins < 60) {
    return `${mins}m ago`;
  }

  const hours = Math.floor(mins / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(iso).toLocaleDateString();
}

function sortByNewest(
  items: AnnouncementLite[],
): AnnouncementLite[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  );
}

export function NotificationBell({
  href,
}: {
  href: string;
}) {
  const { accessToken, profile } = useAuth();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AnnouncementLite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const readKey = readSetKey(profile?.userId);

  /*
   * Keep all announcements available locally.
   * Read/unread status is stored per user through notification-reads.
   */
  const unread = useMemo(() => {
    return sortByNewest(
      items.filter(
        (announcement) =>
          !isMarkedRead(readKey, announcement.id),
      ),
    );
  }, [items, readKey]);

  /*
   * Only five are displayed in the dropdown.
   * The badge, however, represents the TOTAL unread count.
   */
  const recent = useMemo(() => {
    return unread.slice(0, 5);
  }, [unread]);

  /*
   * Load announcements.
   */
  useEffect(() => {
    if (!accessToken) {
      setItems([]);
      return;
    }

    let cancelled = false;

    async function loadAnnouncements() {
      setIsLoading(true);

      try {
        const params = new URLSearchParams();

        if (profile?.departmentId) {
          params.set(
            'departmentId',
            profile.departmentId,
          );
        }

        if (profile?.sectionId) {
          params.set(
            'sectionId',
            profile.sectionId,
          );
        }

        const query = params.toString();

        const data = await apiFetch<AnnouncementLite[]>(
          `/notifications${query ? `?${query}` : ''}`,
          {
            token: accessToken,
          },
        );

        if (!cancelled) {
          setItems(
            Array.isArray(data)
              ? sortByNewest(data)
              : [],
          );
        }
      } catch {
        /*
         * Notifications should never break the rest
         * of the dashboard if their request fails.
         */
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAnnouncements();

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    profile?.departmentId,
    profile?.sectionId,
  ]);

  /*
   * Close dropdown when clicking outside.
   */
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;

      if (
        ref.current &&
        target &&
        !ref.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handlePointerDown,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown,
      );
    };
  }, []);

  /*
   * Close with Escape and return focus to the bell.
   */
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [open]);

  function handleMarkAll() {
    if (unread.length === 0) {
      return;
    }

    markManyRead(
      readKey,
      unread.map(
        (announcement) => announcement.id,
      ),
    );

    /*
     * Force derived unread state to recalculate.
     */
    setItems((current) => [...current]);
  }

  function handleMarkRead(id: string) {
    markRead(readKey, id);

    setItems((current) => [...current]);
  }

  const unreadCount = unread.length;

  return (
    <div
      ref={ref}
      className="relative"
    >
      {/* =====================================================
          BELL BUTTON
      ===================================================== */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={
          unreadCount > 0
            ? `Announcements, ${unreadCount} unread`
            : 'Announcements'
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        className="
          relative
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-lg
          text-slate-500
          transition
          hover:bg-slate-100
          hover:text-slate-900
          focus:outline-none
          focus:ring-2
          focus:ring-slate-900/10
        "
      >
        <Bell
          className="h-[18px] w-[18px]"
          strokeWidth={1.7}
          aria-hidden="true"
        />

        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="
              absolute
              -right-0.5
              -top-0.5
              flex
              min-h-4
              min-w-4
              items-center
              justify-center
              rounded-full
              bg-red-600
              px-1
              text-[9px]
              font-semibold
              leading-none
              text-white
              ring-2
              ring-white
            "
          >
            {unreadCount > 99
              ? '99+'
              : unreadCount}
          </span>
        )}
      </button>

      {/* =====================================================
          DROPDOWN
      ===================================================== */}
      {open && (
        <div
          role="dialog"
          aria-label="Announcements"
          className="
            absolute
            right-0
            z-50
            mt-2
            w-[360px]
            max-w-[calc(100vw-1.5rem)]
            overflow-hidden
            rounded-xl
            border
            border-slate-200
            bg-white
            shadow-[0_12px_40px_rgba(15,23,42,0.12)]
          "
        >
          {/* =================================================
              HEADER
          ================================================= */}
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Announcements
                </p>

                <p className="mt-0.5 text-[11px] text-slate-400">
                  {isLoading
                    ? 'Checking for new notices…'
                    : unreadCount > 0
                      ? `${unreadCount} unread ${unreadCount === 1
                        ? 'announcement'
                        : 'announcements'
                      }`
                      : 'You are all caught up'}
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="
                    shrink-0
                    rounded-md
                    px-2
                    py-1
                    text-[11px]
                    font-medium
                    text-slate-500
                    transition
                    hover:bg-slate-100
                    hover:text-slate-900
                    focus:outline-none
                    focus:ring-2
                    focus:ring-slate-900/10
                  "
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* =================================================
              CONTENT
          ================================================= */}
          <div className="max-h-[360px] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-1 p-3">
                <NotificationSkeleton />
                <NotificationSkeleton />
                <NotificationSkeleton />
              </div>
            ) : recent.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <Check
                    className="h-4 w-4 text-slate-500"
                    aria-hidden="true"
                  />
                </div>

                <p className="mt-3 text-sm font-medium text-slate-700">
                  You&apos;re all caught up
                </p>

                <p className="mx-auto mt-1 max-w-[250px] text-xs leading-5 text-slate-400">
                  New announcements will appear here when
                  they are posted.
                </p>
              </div>
            ) : (
              <div>
                {recent.map((announcement) => (
                  <button
                    key={announcement.id}
                    type="button"
                    onClick={() =>
                      handleMarkRead(
                        announcement.id,
                      )
                    }
                    className="
                      group
                      flex
                      w-full
                      items-start
                      gap-3
                      border-b
                      border-slate-100
                      px-4
                      py-3.5
                      text-left
                      transition
                      last:border-b-0
                      hover:bg-slate-50
                      focus:bg-slate-50
                      focus:outline-none
                    "
                  >
                    {/* Unread indicator */}
                    <span
                      className="
                        mt-1.5
                        h-2
                        w-2
                        shrink-0
                        rounded-full
                        bg-red-600
                      "
                      aria-hidden="true"
                    />

                    {/* Announcement */}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {announcement.title}
                      </span>

                      <span className="mt-1 block text-[11px] text-slate-400">
                        {timeAgo(
                          announcement.createdAt,
                        )}
                      </span>
                    </span>

                    <ChevronRight
                      className="
                        mt-0.5
                        h-4
                        w-4
                        shrink-0
                        text-slate-300
                        transition
                        group-hover:translate-x-0.5
                        group-hover:text-slate-500
                      "
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* More unread indicator */}
            {!isLoading &&
              unreadCount > recent.length && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
                  <p className="text-center text-[11px] text-slate-400">
                    + {unreadCount - recent.length}{' '}
                    more unread
                  </p>
                </div>
              )}
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}
          <Link
            href={href}
            onClick={() => setOpen(false)}
            className="
              flex
              items-center
              justify-center
              gap-1.5
              border-t
              border-slate-200
              px-4
              py-3
              text-xs
              font-medium
              text-slate-600
              transition
              hover:bg-slate-50
              hover:text-slate-900
              focus:outline-none
              focus:ring-2
              focus:ring-inset
              focus:ring-slate-900/10
            "
          >
            View all announcements

            <ChevronRight
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   LOADING SKELETON
========================================================= */

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg px-1 py-3">
      <div className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-slate-200" />

      <div className="min-w-0 flex-1">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-100" />

        <div className="mt-2 h-2.5 w-16 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}