'use client';

import { useAuth } from '@/lib/auth-context';

export default function StudentDashboardPage() {
  const { logout } = useAuth();

  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Student Dashboard</h1>
        <button onClick={logout} className="text-sm text-slate-500 underline">
          Log out
        </button>
      </div>
      {/* TODO: pull today's classes, CGPA, attendance summary via apiFetch */}
    </main>
  );
}
