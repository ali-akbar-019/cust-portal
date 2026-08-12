'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Ribbon } from '@/components/ui/ribbon';
import { NotificationBell } from '@/components/ui/notification-bell';

interface NavItem {
  href: string;
  label: string;
}

export function RoleLayout({
  title,
  items,
  notificationsHref,
  children,
}: {
  title: string;
  items: NavItem[];
  notificationsHref?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { logout, profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const activeItem = items.find((item) => pathname === item.href);
  const pageLabel = activeItem?.label ?? title;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <Image src="/cust-logo.png" alt="CUST" width={38} height={38} className="shrink-0" />
        <div>
          <p className="font-serif text-sm font-semibold leading-tight text-white">CUST Portal</p>
          <Ribbon tone="crimson">{title}</Ribbon>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-md border-l-2 px-3 py-2 text-sm transition ${
                active
                  ? 'border-red-500 bg-white/5 font-medium text-white'
                  : 'border-transparent text-slate-400 hover:border-slate-600 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <p className="truncate text-xs text-slate-400">{profile?.email}</p>
        <button
          onClick={() => setConfirmLogout(true)}
          className="mt-2 w-full rounded-md px-3 py-1.5 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">{sidebarContent}</aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebarContent}</div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        {/* mobile top bar */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M2.5 5h15M2.5 10h15M2.5 15h15" strokeLinecap="round" />
            </svg>
          </button>
          <Image src="/cust-logo.png" alt="CUST" width={24} height={24} />
          <span className="font-serif text-sm font-semibold text-slate-900">CUST Portal</span>
          <div className="ml-auto">{notificationsHref && <NotificationBell href={notificationsHref} />}</div>
        </header>

        {/* desktop top bar */}
        {notificationsHref && (
          <header className="hidden items-center justify-between border-b border-slate-200 bg-white px-6 py-3 lg:flex">
            <div className="flex items-center gap-2">
              <Ribbon tone="crimson">{title}</Ribbon>
              <span className="font-serif text-sm font-semibold text-slate-900">{pageLabel}</span>
            </div>
            <NotificationBell href={notificationsHref} />
          </header>
        )}

        <div className="flex-1">{children}</div>
      </div>

      {confirmLogout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setConfirmLogout(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 id="logout-dialog-title" className="font-serif text-lg font-semibold text-slate-900">
                  Log out of your account?
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  You'll need your password to sign back in. Any unsaved work will be lost.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
