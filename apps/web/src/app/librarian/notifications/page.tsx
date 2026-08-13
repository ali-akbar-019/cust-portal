'use client';

import { AnnouncementsFeed } from '@/components/notifications/announcements-feed';

export default function LibrarianNotificationsPage() {
  return (
    <main className="w-full min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
      <AnnouncementsFeed
        eyebrow="Notices Board"
        title="Announcements"
        subtitle="Official notices broadcast to library staff. Open an announcement to mark it as read."
      />
    </main>
  );
}
