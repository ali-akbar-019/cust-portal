import { RoleLayout } from '@/components/shared/role-layout';

const LIBRARIAN_NAV = [
  { href: '/librarian/dashboard', label: 'Dashboard' },
  { href: '/librarian/books', label: 'Book Catalog' },
  { href: '/librarian/clearances', label: 'Clearance Requests' },
];

export default function LibrarianLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout title="Librarian" items={LIBRARIAN_NAV}>
      {children}
    </RoleLayout>
  );
}
