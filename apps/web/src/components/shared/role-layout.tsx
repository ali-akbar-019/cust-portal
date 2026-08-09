'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Ribbon } from '@/components/ui/ribbon';

interface NavItem {
  href: string;
  label: string;
}

export function RoleLayout({ title, items, children }: { title: string; items: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

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
          onClick={logout}
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
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
