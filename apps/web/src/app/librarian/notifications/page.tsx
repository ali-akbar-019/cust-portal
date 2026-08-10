import { AnnouncementsFeed } from '@/components/notifications/announcements-feed';

export default function LibrarianNotificationsPage() {
  return (
    <AnnouncementsFeed
      eyebrow="Notices Board"
      title="Announcements"
      subtitle="Official notices broadcast to library staff. Click one to mark it read."
    />
  );
}