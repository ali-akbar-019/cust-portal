import { RoleLayout } from '@/components/shared/role-layout';

const LIBRARIAN_NAV = [
  { href: '/librarian/dashboard', label: 'Dashboard' },
  { href: '/librarian/books', label: 'Book Catalog' },
  { href: '/librarian/clearances', label: 'Clearance Requests' },
  { href: '/librarian/notifications', label: 'Announcements' },
];

export default function LibrarianLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout
      title="Librarian"
      items={LIBRARIAN_NAV}
      notificationsHref="/librarian/notifications"
    >
      {children}
    </RoleLayout>
  );
}
