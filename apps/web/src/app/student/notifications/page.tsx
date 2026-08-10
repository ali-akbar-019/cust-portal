import { AnnouncementsFeed } from '@/components/notifications/announcements-feed';

export default function StudentNotificationsPage() {
  return (
    <AnnouncementsFeed
      eyebrow="Notices Board"
      title="Announcements"
      subtitle="Official notices broadcast to everyone, your department, or the courses you are enrolled in. Click one to mark it read."
    />
  );
}