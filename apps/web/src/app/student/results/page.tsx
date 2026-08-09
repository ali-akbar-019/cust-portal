'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
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
  semester: number;
  term: string | null;
  courses: CourseBreakdown[];
  sgpa: number | null;
  creditHours: number;
}
interface Breakdown {
  semesters: SemesterBreakdown[];
  currentSemester: number;
  cgpa: number;
  totalCreditHours: number;
}

const ORDINAL = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n}st`;
  if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
  return `${n}th`;
};

export default function StudentResultsPage() {
  const { accessToken, profile, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<Breakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTerm, setOpenTerm] = useState<number | null>(null);
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
        const lastFilled = [...res.semesters].reverse().find((s) => s.term !== null);
        setOpenTerm(lastFilled?.semester ?? res.semesters[0]?.semester ?? null);
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

  if (error) return <main className="p-6 lg:p-10"><PageHeader title="Results" subtitle="Your complete academic record" /><p className="text-sm text-red-600">{error}</p></main>;
  if (!data) return <main className="p-6 lg:p-10"><PageHeader title="Results" subtitle="Your complete academic record" /><p className="text-sm text-slate-500">Loading results...</p></main>;

  const recorded = data.semesters.filter((s) => s.term !== null).length;
  const recordedSems = data.semesters.filter((s) => s.term !== null);
  const lastRecorded = recordedSems[recordedSems.length - 1];

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Academic Record"
        title="Results & Transcript"
        subtitle={`Current semester: ${ORDINAL(data.currentSemester)} — ${recorded} semester${recorded === 1 ? '' : 's'} of records on file so far`}
        action={
          <button
            onClick={handleDownloadTranscript}
            disabled={isDownloading}
            className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isDownloading ? 'Preparing...' : 'Download Transcript (PDF)'}
          </button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cumulative GPA" value={data.cgpa.toFixed(2)} hint="Across all recorded semesters" />
        <StatCard label="Current Semester" value={ORDINAL(data.currentSemester)} />
        <StatCard label="Semesters on File" value={String(recorded)} />
        <StatCard label="Credit Hours" value={String(data.totalCreditHours)} />
      </div>

      {data.semesters.length === 0 && (
        <div className="max-w-xl">
          <EmptyState
            title="No results recorded yet"
            hint="Grades appear here semester by semester as your teachers enter them. Your transcript will lay out every semester from the 1st to your current one."
          />
        </div>
      )}

      <div className="max-w-2xl space-y-3">
        {data.semesters.map((sem) => {
          const isOpen = openTerm === sem.semester;
          const isCurrent = sem.semester === data.currentSemester;
          const empty = sem.term === null;
          return (
            <div key={sem.semester} className={`ledger-card overflow-hidden ${isCurrent ? 'ring-1 ring-red-600/30' : ''}`}>
              <button
                onClick={() => setOpenTerm(empty ? null : isOpen ? null : sem.semester)}
                disabled={empty}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span className="flex items-center gap-2">
                  <span className="font-serif text-base font-semibold text-slate-900">
                    {ORDINAL(sem.semester)} Semester
                  </span>
                  {isCurrent && <Ribbon tone="crimson">Current</Ribbon>}
                </span>
                {!empty ? (
                  <span className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="hidden sm:inline">{sem.term}</span>
                    <Ribbon tone="navy">SGPA {sem.sgpa?.toFixed(2) ?? '—'}</Ribbon>
                    <span className="font-data text-xs">{sem.creditHours} CH</span>
                    <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Not yet recorded</span>
                )}
              </button>

              {isOpen && !empty && (
                <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-4">
                  <p className="mb-3 text-center text-xs uppercase tracking-wide text-slate-400">{sem.term}</p>
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
                  {sem.courses.length === 0 && (
                    <p className="text-sm text-slate-500">Enrolled courses for this semester aren't graded yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lastRecorded && lastRecorded.semester < data.currentSemester && (
        <p className="mt-6 max-w-2xl text-xs text-slate-400">
          Earlier semesters appear blank until the registrar records those terms — your results will fill in history-first as old records are entered.
        </p>
      )}
    </main>
  );
}