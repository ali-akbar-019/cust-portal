import { RoleLayout } from '@/components/shared/role-layout';

const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/blocks', label: 'Blocks & Rooms' },
  { href: '/admin/timetable-generator', label: 'Timetable Generator' },
  { href: '/admin/users', label: 'Manage Users' },
  { href: '/admin/notifications', label: 'Announcements' },
  { href: '/admin/invoices', label: 'Invoices' },
  { href: '/admin/library', label: 'Library Clearances' },
  { href: '/admin/complaints', label: 'Complaints' },
  { href: '/admin/requests', label: 'Requests' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout title="Admin" items={ADMIN_NAV}>
      {children}
    </RoleLayout>
  );
}
