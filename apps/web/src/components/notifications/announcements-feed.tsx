'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';
import {
  isMarkedRead,
  markManyRead,
  markRead,
  readSetKey,
} from '@/lib/notification-reads';

interface AnnouncementView {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  postedBy: {
    email: string;
    role: string;
  };
}

interface AnnouncementsFeedProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

function formatAnnouncementDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleString();
}

function getRoleTone(
  role: string,
): 'navy' | 'sapphire' {
  return role.toUpperCase() === 'ADMIN'
    ? 'navy'
    : 'sapphire';
}

export function AnnouncementsFeed({
  eyebrow,
  title,
  subtitle,
}: AnnouncementsFeedProps) {
  const { accessToken, profile } = useAuth();

  const [items, setItems] = useState<AnnouncementView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRead, setShowRead] = useState(false);

  /*
   * Keep the read state scoped to the currently authenticated user.
   * This works for students, teachers, librarians, admins, etc.
   */
  const readKey = useMemo(
    () => readSetKey(profile?.userId),
    [profile?.userId],
  );

  const unreadList = useMemo(
    () =>
      items.filter(
        (announcement) =>
          !isMarkedRead(readKey, announcement.id),
      ),
    [items, readKey],
  );

  const readList = useMemo(
    () =>
      items.filter((announcement) =>
        isMarkedRead(readKey, announcement.id),
      ),
    [items, readKey],
  );

  /*
   * Build the notification query from whatever targeting
   * information the authenticated user has.
   *
   * No role-specific logic is used here, so the same component
   * can safely be reused by students, teachers and librarians.
   */
  const notificationQuery = useMemo(() => {
    const params = new URLSearchParams();

    if (profile?.departmentId) {
      params.set('departmentId', profile.departmentId);
    }

    if (profile?.sectionId) {
      params.set('sectionId', profile.sectionId);
    }

    const queryString = params.toString();

    return queryString
      ? `/notifications?${queryString}`
      : '/notifications';
  }, [
    profile?.departmentId,
    profile?.sectionId,
  ]);

  const loadAnnouncements = useCallback(async () => {
    if (!accessToken) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await apiFetch<AnnouncementView[]>(
        notificationQuery,
        {
          token: accessToken,
        },
      );

      /*
       * Defensive handling in case the backend unexpectedly
       * returns null/undefined instead of an array.
       */
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setItems([]);

      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load announcements.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, notificationQuery]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleMarkRead = useCallback(
    (announcementId: string) => {
      markRead(readKey, announcementId);

      /*
       * Replace the array instead of mutating it.
       * This guarantees React re-renders reliably.
       */
      setItems((current) => [...current]);
    },
    [readKey],
  );

  const handleMarkAllRead = useCallback(() => {
    if (unreadList.length === 0) {
      return;
    }

    markManyRead(
      readKey,
      unreadList.map(
        (announcement) => announcement.id,
      ),
    );

    setItems((current) => [...current]);
  }, [readKey, unreadList]);

  const toggleRead = useCallback(() => {
    setShowRead((current) => !current);
  }, []);

  /*
   * Loading state
   */
  if (isLoading) {
    return (
      <main className="w-full min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
        />

        <div className="mt-6 max-w-2xl space-y-3">
          <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />

          <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />

          <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
        </div>
      </main>
    );
  }

  /*
   * Error state
   */
  if (error) {
    return (
      <main className="w-full min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
        />

        <div className="mt-6 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-800">
            Unable to load announcements
          </p>

          <p className="mt-1 text-sm leading-6 text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={loadAnnouncements}
            className="mt-4 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        action={
          unreadList.length > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            >
              Mark all read ({unreadList.length})
            </button>
          ) : undefined
        }
      />

      {items.length > 0 && (
        <div className="mb-6 flex min-w-0 flex-wrap items-center gap-2">
          <Ribbon
            tone={
              unreadList.length > 0
                ? 'crimson'
                : 'emerald'
            }
          >
            {unreadList.length === 0
              ? 'Everything read'
              : `${unreadList.length} unread`}
          </Ribbon>

          <span className="text-xs text-slate-400">
            Read notices are moved out of this list — find
            them again below.
          </span>
        </div>
      )}

      {unreadList.length > 0 ? (
        <section
          aria-label="Unread announcements"
          className="max-w-2xl space-y-3"
        >
          {unreadList.map((announcement) => (
            <button
              key={announcement.id}
              type="button"
              onClick={() =>
                handleMarkRead(announcement.id)
              }
              className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              aria-label={`Mark announcement "${announcement.title}" as read`}
            >
              <article className="rounded-lg border border-blue-200 bg-blue-50/40 p-5 transition hover:bg-blue-50">
                <div className="mb-1 flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-2 font-medium text-slate-900">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-red-600"
                      aria-hidden="true"
                    />

                    <span className="break-words">
                      {announcement.title}
                    </span>
                  </p>

                  <Ribbon
                    tone={getRoleTone(
                      announcement.postedBy.role,
                    )}
                  >
                    {announcement.postedBy.role}
                  </Ribbon>
                </div>

                <p className="mb-3 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                  {announcement.message}
                </p>

                <p className="break-words text-xs text-slate-400">
                  Posted{' '}
                  {formatAnnouncementDate(
                    announcement.createdAt,
                  )}{' '}
                  by {announcement.postedBy.email}
                </p>
              </article>
            </button>
          ))}
        </section>
      ) : items.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          hint="New notices from the administration and faculty will appear here."
        />
      ) : (
        <EmptyState
          title="You're all caught up"
          hint="Everything in your inbox has been read. New announcements will show up here, and older ones can be reopened below."
        />
      )}

      {readList.length > 0 && (
        <section
          aria-label="Previously read announcements"
          className="mt-8"
        >
          <button
            type="button"
            onClick={toggleRead}
            aria-expanded={showRead}
            className="mb-3 text-sm font-medium text-blue-600 underline underline-offset-2 transition hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
          >
            {showRead ? 'Hide' : 'Show'} previously read (
            {readList.length})
          </button>

          {showRead && (
            <div className="max-w-2xl space-y-3">
              {readList.map((announcement) => (
                <article
                  key={announcement.id}
                  className="ledger-card p-5 opacity-70"
                >
                  <div className="mb-1 flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-2 font-medium text-slate-500">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-slate-200"
                        aria-hidden="true"
                      />

                      <span className="break-words">
                        {announcement.title}
                      </span>
                    </p>

                    <Ribbon
                      tone={getRoleTone(
                        announcement.postedBy.role,
                      )}
                    >
                      {announcement.postedBy.role}
                    </Ribbon>
                  </div>

                  <p className="mb-3 whitespace-pre-line break-words text-sm leading-6 text-slate-500">
                    {announcement.message}
                  </p>

                  <p className="break-words text-xs text-slate-400">
                    Posted{' '}
                    {formatAnnouncementDate(
                      announcement.createdAt,
                    )}{' '}
                    by {announcement.postedBy.email}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}