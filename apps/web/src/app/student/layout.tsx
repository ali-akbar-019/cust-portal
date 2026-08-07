import { RoleLayout } from '@/components/shared/role-layout';

const STUDENT_NAV = [
  { href: '/student/dashboard', label: 'Dashboard' },
  { href: '/student/timetable', label: 'Timetable' },
  { href: '/student/attendance', label: 'Attendance' },
  { href: '/student/results', label: 'Results' },
  { href: '/student/enrollment', label: 'Enrollment' },
  { href: '/student/assignments', label: 'Assignments' },
  { href: '/student/library', label: 'Library' },
  { href: '/student/invoices', label: 'Invoices' },
  { href: '/student/complaints', label: 'Complaints' },
  { href: '/student/requests', label: 'Requests' },
  { href: '/student/feedback', label: 'Feedback' },
  { href: '/student/notifications', label: 'Announcements' },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout title="Student" items={STUDENT_NAV}>
      {children}
    </RoleLayout>
  );
}
