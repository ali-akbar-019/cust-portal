'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface MySection {
  id: string;
  courseId: string;
  course: { title: string; code: string };
}
interface RosterStudent {
  id: string;
  enrollmentNo: string;
  user: { email: string };
}

const COMPONENTS = ['quiz1', 'quiz2', 'assignment1', 'midterm', 'final'];

export default function TeacherGradesPage() {
  const { accessToken, profile } = useAuth();
  const [mySections, setMySections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [studentId, setStudentId] = useState('');
  const [component, setComponent] = useState(COMPONENTS[0]);
  const [marks, setMarks] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !profile?.teacherId) return;
    apiFetch<MySection[]>(`/teachers/${profile.teacherId}/sections`, { token: accessToken })
      .then((sections) => {
        setMySections(sections);
        if (sections.length > 0) setSectionId(sections[0].id);
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

  const currentCourseId = mySections.find((s) => s.id === sectionId)?.courseId;

  async function handleSubmit() {
    setStatus(null);
    setError(null);
    if (!studentId || !currentCourseId) return;
    try {
      await apiFetch('/grades', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          studentId,
          courseId: currentCourseId,
          component,
          marks: Number(marks),
          maxMarks: Number(maxMarks),
        }),
      });
      setStatus('Grade saved.');
      setMarks('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save grade');
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Enter Grades</h1>

      <div className="max-w-md space-y-3">
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {mySections.length === 0 && <option value="">No sections assigned</option>}
          {mySections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.course.title} ({s.course.code})
            </option>
          ))}
        </select>

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

        <select
          value={component}
          onChange={(e) => setComponent(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {COMPONENTS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            placeholder="Marks obtained"
            type="number"
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Max marks"
            type="number"
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {status && <p className="text-sm text-green-600">{status}</p>}
        <button
          onClick={handleSubmit}
          disabled={!studentId || !marks}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Save Grade
        </button>
      </div>
    </main>
  );
}
