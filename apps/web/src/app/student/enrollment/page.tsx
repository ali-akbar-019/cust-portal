'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface SectionView {
  id: string;
  term: string;
  capacity: number;
  seatsRemaining: number;
  course: { code: string; title: string; creditHours: number };
  teacher: { user: { email: string } };
}

export default function StudentEnrollmentPage() {
  const { accessToken } = useAuth();
  const [departmentId, setDepartmentId] = useState('');
  const [sections, setSections] = useState<SectionView[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSections() {
    if (!departmentId) return;
    setError(null);
    try {
      const data = await apiFetch<SectionView[]>(`/sections?departmentId=${departmentId}`, {
        token: accessToken,
      });
      setSections(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load sections');
    }
  }

  async function handleEnroll(sectionId: string) {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/enrollment', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ sectionId }),
      });
      setStatus('Enrolled successfully.');
      loadSections(); // refresh seat counts
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enrollment failed');
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Enroll in Courses</h1>

      <div className="mb-4 flex max-w-md gap-2">
        <input
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          placeholder="Department ID"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button onClick={loadSections} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Browse
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {status && <p className="mb-3 text-sm text-green-600">{status}</p>}

      <div className="space-y-3">
        {sections.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="font-medium">
                {s.course.title} ({s.course.code})
              </p>
              <p className="text-xs text-slate-500">
                {s.term} · {s.course.creditHours} CH · {s.teacher.user.email} · {s.seatsRemaining}/{s.capacity} seats left
              </p>
            </div>
            <button
              onClick={() => handleEnroll(s.id)}
              disabled={s.seatsRemaining <= 0}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              {s.seatsRemaining <= 0 ? 'Full' : 'Enroll'}
            </button>
          </div>
        ))}
      </div>
      {/* Note: enrollment will be rejected server-side with a clear reason if
          no enrollment window is currently open for the department — see
          EnrollmentService.selfEnroll's three gates */}
    </main>
  );
}
