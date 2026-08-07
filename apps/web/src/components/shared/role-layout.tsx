'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  href: string;
  label: string;
}

export function RoleLayout({ title, items, children }: { title: string; items: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-slate-50 p-4">
        <p className="mb-4 px-2 text-sm font-semibold text-slate-700">{title}</p>
        <nav className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-2 py-1.5 text-sm ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="mt-6 w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          Log out
        </button>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
