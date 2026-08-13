'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const accountRef = useRef<HTMLDivElement>(null);

  const activeItem = items.find((item) => pathname === item.href);
  const pageLabel = activeItem?.label ?? title;

  const email = profile?.email ?? '';
  const initials = email
    ? email
      ?.split('@')[0]
      ?.split(/[._-]/)
      ?.filter(Boolean)
      ?.slice(0, 2)
      ?.map((part) => part[0]?.toUpperCase())
      ?.join('')
    : 'U';

  /*
   * Close account menu when clicking outside.
   */
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setAccountOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  /*
   * Close mobile navigation when route changes.
   */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /*
   * Prevent background scrolling while mobile drawer is open.
   */
  useEffect(() => {
    if (!mobileOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  /*
   * Escape closes menus / dialogs.
   */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;

      setAccountOpen(false);
      setConfirmLogout(false);
      setMobileOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function openLogoutConfirmation() {
    setAccountOpen(false);
    setConfirmLogout(true);
  }

  function closeLogoutConfirmation() {
    setConfirmLogout(false);
  }

  async function handleLogout() {
    setConfirmLogout(false);
    await logout();
  }

  const sidebarContent = (
    <div className="flex h-full min-h-screen flex-col bg-slate-900 text-slate-300">
      {/* Brand */}
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <Image
            src="/cust-logo.png"
            alt="CUST"
            width={38}
            height={38}
            className="shrink-0"
          />

          <div className="min-w-0">
            <p className="font-serif text-sm font-semibold leading-tight text-white">
              CUST Portal
            </p>

            <div className="mt-1">
              <Ribbon tone="crimson">{title}</Ribbon>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          Navigation
        </p>

        <div className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'group flex items-center rounded-md border-l-2 px-3 py-2.5 text-sm transition',
                  active
                    ? 'border-red-500 bg-white/[0.07] font-medium text-white'
                    : 'border-transparent text-slate-400 hover:border-slate-600 hover:bg-white/[0.04] hover:text-white',
                ].join(' ')}
              >
                <span
                  className={[
                    'mr-3 h-1.5 w-1.5 rounded-full transition',
                    active
                      ? 'bg-red-500'
                      : 'bg-transparent group-hover:bg-slate-600',
                  ].join(' ')}
                />

                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Account */}
      <div className="border-t border-white/10 p-3">
        <div className="relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            className={[
              'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition',
              accountOpen
                ? 'bg-white/[0.08]'
                : 'hover:bg-white/[0.05]',
            ].join(' ')}
          >
            {/* Avatar */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
              {initials}
            </div>

            {/* Email */}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Account
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-300">
                {email || 'Signed in'}
              </p>
            </div>

            {/* Chevron */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className={[
                'shrink-0 text-slate-500 transition-transform',
                accountOpen ? 'rotate-180' : '',
              ].join(' ')}
            >
              <path
                d="m6 9 6 6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Account menu */}
          {accountOpen && (
            <div
              role="menu"
              className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-50 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-2xl shadow-black/30"
            >
              <div className="border-b border-white/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Signed in as
                </p>

                <p className="mt-1 truncate text-xs text-slate-300">
                  {email}
                </p>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={openLogoutConfirmation}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 transition hover:bg-red-500/10 hover:text-red-400"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500/10">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                      strokeLinecap="round"
                    />
                    <path
                      d="m16 17 5-5-5-5M21 12H9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <span>
                  <span className="block font-medium">Log out</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    End your current session
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute inset-y-0 left-0 w-[280px] shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="rounded-md p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M4 6h16M4 12h16M4 18h16"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <Image
            src="/cust-logo.png"
            alt="CUST"
            width={26}
            height={26}
          />

          <div className="min-w-0">
            <p className="truncate font-serif text-sm font-semibold text-slate-900">
              CUST Portal
            </p>
          </div>

          <div className="ml-auto flex items-center">
            {notificationsHref && (
              <NotificationBell href={notificationsHref} />
            )}
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden h-14 items-center justify-between border-b border-slate-200 bg-white px-6 lg:flex">
          <div className="flex min-w-0 items-center gap-3">
            <Ribbon tone="crimson">{title}</Ribbon>

            <span className="h-4 w-px bg-slate-200" />

            <span className="truncate font-serif text-sm font-semibold text-slate-900">
              {pageLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {notificationsHref && (
              <NotificationBell href={notificationsHref} />
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      {/* Logout confirmation */}
      {confirmLogout && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          onMouseDown={closeLogoutConfirmation}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
          >
            {/* Header */}
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                      strokeLinecap="round"
                    />
                    <path
                      d="m16 17 5-5-5-5M21 12H9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <h2
                    id="logout-dialog-title"
                    className="font-serif text-lg font-semibold text-slate-900"
                  >
                    Log out of CUST Portal?
                  </h2>

                  <p
                    id="logout-dialog-description"
                    className="mt-1.5 text-sm leading-5 text-slate-500"
                  >
                    You are currently signed in as{' '}
                    <span className="font-medium text-slate-700">
                      {email}
                    </span>
                    .
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeLogoutConfirmation}
                  aria-label="Close"
                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d="M6 6l12 12M18 6 6 18"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="mt-0.5 shrink-0 text-slate-400"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path
                      d="M12 10v5M12 7.5v.2"
                      strokeLinecap="round"
                    />
                  </svg>

                  <p className="text-xs leading-5 text-slate-500">
                    Your current session will be ended. You can sign back in
                    whenever you need to access your academic portal.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <button
                type="button"
                onClick={closeLogoutConfirmation}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              >
                Stay signed in
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
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