'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { Ribbon } from '@/components/ui/ribbon';

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
interface SemesterBreakdown {
  term: string;
  courses: CourseBreakdown[];
  sgpa: number;
  creditHours: number;
}
interface Breakdown {
  semesters: SemesterBreakdown[];
  cgpa: number;
  totalCreditHours: number;
}

export default function StudentResultsPage() {
  const { accessToken, profile, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<Breakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTerm, setOpenTerm] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (authLoading || !accessToken) return;
    if (!profile?.studentId) {
      setError('Could not resolve your student profile. Try logging out and back in.');
      return;
    }
    apiFetch<Breakdown>(`/grades/student/${profile.studentId}`, { token: accessToken })
      .then((res) => {
        setData(res);
        if (res.semesters.length > 0) setOpenTerm(res.semesters[0].term);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load results'));
  }, [accessToken, profile, authLoading]);

  async function handleDownloadTranscript() {
    if (!profile?.studentId) return;
    setIsDownloading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
      const res = await fetch(`${base}/grades/student/${profile.studentId}/transcript`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${profile.enrollmentNo ?? profile.studentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download transcript.');
    } finally {
      setIsDownloading(false);
    }
  }

  if (error) return <main className="p-8 text-sm text-red-600">{error}</main>;
  if (!data) return <main className="p-8 text-sm text-slate-500">Loading...</main>;

  return (
    <main className="p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Academic Record</p>
          <h1 className="font-serif text-2xl font-semibold text-slate-900">Results</h1>
        </div>
        <button
          onClick={handleDownloadTranscript}
          disabled={isDownloading}
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
        >
          {isDownloading ? 'Preparing...' : 'Download Transcript'}
        </button>
      </div>

      <div className="ledger-card mb-8 max-w-xs p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Cumulative GPA</p>
        <p className="font-serif text-4xl font-semibold text-slate-900">{data.cgpa.toFixed(2)}</p>
        <p className="mt-1 text-xs text-slate-500">{data.totalCreditHours} total credit hours</p>
      </div>

      {data.semesters.length === 0 && (
        <p className="text-sm text-slate-500">No results yet — grades will appear here once your teachers enter them.</p>
      )}

      <div className="max-w-2xl space-y-3">
        {data.semesters.map((sem) => {
          const isOpen = openTerm === sem.term;
          return (
            <div key={sem.term} className="ledger-card overflow-hidden">
              <button
                onClick={() => setOpenTerm(isOpen ? null : sem.term)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-serif text-base font-semibold text-slate-900">{sem.term}</span>
                <span className="flex items-center gap-2 text-sm text-slate-500">
                  <Ribbon tone="navy">SGPA {sem.sgpa.toFixed(2)}</Ribbon>
                  <span className="font-data text-xs">{sem.creditHours} CH</span>
                  <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                </span>
              </button>
              {isOpen && (
                <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-4">
                  {sem.courses.map((c) => (
                    <div key={c.courseId} className="rounded-md border border-slate-200 bg-white p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{c.courseTitle}</p>
                          <p className="font-data text-xs text-slate-500">
                            {c.courseCode} · {c.creditHours} CH
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-serif text-xl font-semibold text-slate-900">{c.letter}</p>
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
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
