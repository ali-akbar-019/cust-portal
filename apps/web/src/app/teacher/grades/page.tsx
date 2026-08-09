'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';

interface MySection {
  id: string;
  courseId: string;
  course: { title: string; code: string };
  enrolledCount: number;
}
interface RosterStudent {
  id: string;
  enrollmentNo: string;
  user: { email: string };
}

const COMPONENTS = ['quiz1', 'quiz2', 'assignment1', 'midterm', 'final'];
const COMPONENT_LABEL: Record<string, string> = {
  quiz1: 'Quiz 1',
  quiz2: 'Quiz 2',
  assignment1: 'Assignment',
  midterm: 'Midterm',
  final: 'Final',
};

export default function TeacherGradesPage() {
  const { accessToken, profile } = useAuth();
  const [mySections, setMySections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [studentId, setStudentId] = useState('');
  const [component, setComponent] = useState<string>(COMPONENTS[0] ?? 'quiz1');
  const [marks, setMarks] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !profile?.teacherId) return;
    apiFetch<MySection[]>(`/teachers/${profile.teacherId}/sections`, { token: accessToken })
      .then((sections) => {
        setMySections(sections);
        if (sections.length > 0) setSectionId(sections[0]?.id ?? '');
      })
      .catch(() => {});
  }, [accessToken, profile]);

  useEffect(() => {
    if (!sectionId || !accessToken) return;
    apiFetch<RosterStudent[]>(`/sections/${sectionId}/roster`, { token: accessToken })
      .then((r) => {
        setRoster(r);
        setStudentId(r[0]?.id ?? '');
      })
      .catch(() => {});
  }, [sectionId, accessToken]);

  const currentCourse = mySections.find((s) => s.id === sectionId);

  async function handleSubmit() {
    setStatus(null);
    setError(null);
    if (!studentId || !currentCourse) return;
    try {
      await apiFetch('/grades', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          studentId,
          courseId: currentCourse.courseId,
          component,
          marks: Number(marks),
          maxMarks: Number(maxMarks),
        }),
      });
      setStatus(`${COMPONENT_LABEL[component]} saved for ${roster.find((s) => s.id === studentId)?.enrollmentNo ?? 'student'} — re-entering updates it in place.`);
      setMarks('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save grade');
    }
  }

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Faculty"
        title="Enter Grades"
        subtitle="Record component-wise marks for your students. Saved marks for the same student, course and component update in place — no duplicates."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sections</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{mySections.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Current course</p>
          <p className="font-data text-sm font-semibold text-slate-900">{currentCourse?.course.code ?? '—'}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Students in section</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{roster.length}</p>
        </div>
      </div>

      <div className="ledger-card max-w-xl space-y-4 p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Section</span>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {mySections.length === 0 && <option value="">No sections assigned</option>}
              {mySections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.course.title} ({s.course.code}) · {s.enrolledCount} students
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Component</span>
            <select
              value={component}
              onChange={(e) => setComponent(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {COMPONENTS.map((c) => (
                <option key={c} value={c}>
                  {COMPONENT_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Student</span>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {roster.length === 0 && <option value="">No students enrolled</option>}
            {roster.map((s) => (
              <option key={s.id} value={s.id}>
                {s.enrollmentNo} · {s.user.email}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Marks obtained</span>
            <input
              placeholder="e.g. 42"
              type="number"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Max marks</span>
            <input
              type="number"
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {status && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{status}</p>}

        <button
          onClick={handleSubmit}
          disabled={!studentId || marks === ''}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
        >
          Save Grade
        </button>

        <p className="text-xs text-slate-400">
          Grade scale: percentages are converted to the standard 4.0 scale automatically — students see the result on their Results page and transcript.
        </p>
      </div>
    </main>
  );
}