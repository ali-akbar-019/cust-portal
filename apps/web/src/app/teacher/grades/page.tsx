'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

export default function TeacherGradesPage() {
  const { accessToken } = useAuth();
  const [form, setForm] = useState({ studentId: '', courseId: '', component: '', marks: '', maxMarks: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/grades', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          ...form,
          marks: Number(form.marks),
          maxMarks: Number(form.maxMarks),
        }),
      });
      setMessage(`Saved ${form.component} for student.`);
      setForm((prev) => ({ ...prev, component: '', marks: '', maxMarks: '' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save grade');
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Enter Grade</h1>

      <div className="max-w-sm space-y-3">
        <input
          placeholder="Student ID"
          value={form.studentId}
          onChange={(e) => update('studentId', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Course ID"
          value={form.courseId}
          onChange={(e) => update('courseId', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Component (e.g. midterm)"
          value={form.component}
          onChange={(e) => update('component', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            placeholder="Marks obtained"
            type="number"
            value={form.marks}
            onChange={(e) => update('marks', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Max marks"
            type="number"
            value={form.maxMarks}
            onChange={(e) => update('maxMarks', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button onClick={handleSubmit} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Save Grade
        </button>
      </div>
      {/* TODO: replace raw ID inputs with dropdowns once section-roster and
          course-list lookups are wired into this page */}
    </main>
  );
}
