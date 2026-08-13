'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!role) {
      router.replace('/login');
      return;
    }

    const destinations: Record<string, string> = {
      ADMIN: '/admin/dashboard',
      TEACHER: '/teacher/dashboard',
      LIBRARIAN: '/librarian/dashboard',
      STUDENT: '/student/dashboard',
    };

    router.replace(destinations[role] ?? '/login');
  }, [role, isLoading, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
          <Image
            src="/cust-logo.png"
            alt="CUST"
            width={38}
            height={38}
            priority
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-200 [animation-delay:300ms]" />
        </div>

        <p className="mt-3 text-xs font-medium text-slate-400">
          Opening your portal
        </p>
      </div>
    </main>
  );
}