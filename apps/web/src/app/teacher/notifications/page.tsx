import { AnnouncementsFeed } from '@/components/notifications/announcements-feed';

export default function TeacherNotificationsPage() {
  return (
    <AnnouncementsFeed
      eyebrow="Notices Board"
      title="Announcements"
      subtitle="Official notices broadcast to faculty and your department. Click one to mark it read."
    />
  );
}