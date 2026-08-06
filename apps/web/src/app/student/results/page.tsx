'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface CourseBreakdown {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  creditHours: number;
  percentage: number;
  letter: string;
  gradePoints: number;
  components: { component: string; marks: number; maxMarks: number }[];
}
interface Breakdown {
  courses: CourseBreakdown[];
  gpa: number;
  totalCreditHours: number;
}

export default function StudentResultsPage() {
  const { accessToken, profile } = useAuth();
  const [data, setData] = useState<Breakdown | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<Breakdown>(`/grades/student/${profile.studentId}`, { token: accessToken })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load results'));
  }, [accessToken, profile]);

  if (error) return <main className="p-8 text-sm text-red-600">{error}</main>;
  if (!data) return <main className="p-8 text-sm text-slate-500">Loading...</main>;

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Results</h1>

      <div className="mb-6 max-w-xs rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-500">GPA</p>
        <p className="text-3xl font-semibold">{data.gpa.toFixed(2)}</p>
        <p className="text-xs text-slate-400">{data.totalCreditHours} credit hours</p>
      </div>

      <div className="space-y-3">
        {data.courses.map((c) => (
          <div key={c.courseId} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <p className="font-medium">{c.courseTitle}</p>
                <p className="text-xs text-slate-500">
                  {c.courseCode} · {c.creditHours} CH
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">{c.letter}</p>
                <p className="text-xs text-slate-500">{c.percentage}%</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
              {c.components.map((comp, i) => (
                <span key={i} className="rounded bg-slate-100 px-2 py-1">
                  {comp.component}: {comp.marks}/{comp.maxMarks}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
