'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    const destination =
      role === 'ADMIN' ? '/admin/dashboard' : role === 'TEACHER' ? '/teacher/dashboard' : role === 'LIBRARIAN' ? '/librarian/dashboard' : '/student/dashboard';
    router.replace(destination);
  }, [role, isLoading, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-400">Loading...</p>
    </main>
  );
}
