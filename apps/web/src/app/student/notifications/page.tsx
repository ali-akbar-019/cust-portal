'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface AnnouncementView {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  postedBy: { email: string; role: string };
}

export default function StudentNotificationsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<AnnouncementView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    // TODO: pass the student's real departmentId/sectionId once /students/me exists
    apiFetch<AnnouncementView[]>('/notifications', { token: accessToken })
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load announcements'));
  }, [accessToken]);

  if (error) return <main className="p-8 text-sm text-red-600">{error}</main>;

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Announcements</h1>
      {items.length === 0 && <p className="text-sm text-slate-500">No announcements yet.</p>}
      <div className="max-w-2xl space-y-3">
        {items.map((a) => (
          <div key={a.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-medium">{a.title}</p>
              <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</p>
            </div>
            <p className="text-sm text-slate-600">{a.message}</p>
            <p className="mt-1 text-xs text-slate-400">— {a.postedBy.email}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
