import { RoleLayout } from '@/components/shared/role-layout';

const TEACHER_NAV = [
  { href: '/teacher/dashboard', label: 'Dashboard' },
  { href: '/teacher/timetable', label: 'My Timetable' },
  { href: '/teacher/attendance', label: 'Mark Attendance' },
  { href: '/teacher/assignments', label: 'Assignments' },
  { href: '/teacher/grades', label: 'Enter Grades' },
  { href: '/teacher/feedback', label: 'Section Feedback' },
  { href: '/teacher/notifications', label: 'Announcements' },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout title="Teacher" items={TEACHER_NAV} notificationsHref="/teacher/notifications">
      {children}
    </RoleLayout>
  );
}
