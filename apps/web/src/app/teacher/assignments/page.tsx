'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface Submission {
  id: string;
  studentId: string;
  fileUrl: string;
  submittedAt: string;
  grade: number | null;
  feedback: string | null;
}
interface AssignmentDetail {
  id: string;
  title: string;
  deadline: string;
  submissions: Submission[];
}

export default function TeacherAssignmentsPage() {
  const { accessToken } = useAuth();
  const [form, setForm] = useState({ sectionId: '', title: '', description: '', deadline: '' });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lookupId, setLookupId] = useState('');
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({});

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/assignments', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify(form),
      });
      setStatus('Assignment created.');
      setForm({ sectionId: form.sectionId, title: '', description: '', deadline: '' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create assignment');
    }
  }

  async function loadDetail() {
    if (!lookupId) return;
    setError(null);
    try {
      const data = await apiFetch<AssignmentDetail>(`/assignments/${lookupId}`, { token: accessToken });
      setDetail(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load assignment');
    }
  }

  async function handleGrade(submissionId: string) {
    const entry = grades[submissionId];
    if (!entry) return;
    try {
      await apiFetch(`/assignments/submissions/${submissionId}/grade`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ grade: Number(entry.grade), feedback: entry.feedback }),
      });
      loadDetail();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save grade');
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Create Assignment</h1>
      <div className="mb-8 max-w-lg space-y-3 rounded-lg border border-slate-200 p-4">
        <input
          placeholder="Section ID"
          value={form.sectionId}
          onChange={(e) => update('sectionId', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Description / instructions"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          value={form.deadline}
          onChange={(e) => update('deadline', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {status && <p className="text-sm text-green-600">{status}</p>}
        <button onClick={handleCreate} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Create
        </button>
      </div>

      <h1 className="mb-4 text-xl font-semibold">View Submissions</h1>
      <div className="mb-4 flex max-w-md gap-2">
        <input
          placeholder="Assignment ID"
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button onClick={loadDetail} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Load
        </button>
      </div>

      {detail && (
        <div className="max-w-lg space-y-3">
          <p className="font-medium">{detail.title}</p>
          {detail.submissions.length === 0 && <p className="text-sm text-slate-500">No submissions yet.</p>}
          {detail.submissions.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-400">
                Student {s.studentId} · submitted {new Date(s.submittedAt).toLocaleString()}
              </p>
              <a href={s.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
                View file
              </a>
              {s.grade !== null ? (
                <p className="mt-1 text-sm text-green-600">Graded: {s.grade}/100</p>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    placeholder="Grade"
                    type="number"
                    value={grades[s.id]?.grade ?? ''}
                    onChange={(e) =>
                      setGrades((prev) => ({ ...prev, [s.id]: { ...prev[s.id], grade: e.target.value, feedback: prev[s.id]?.feedback ?? '' } }))
                    }
                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                  <input
                    placeholder="Feedback"
                    value={grades[s.id]?.feedback ?? ''}
                    onChange={(e) =>
                      setGrades((prev) => ({ ...prev, [s.id]: { grade: prev[s.id]?.grade ?? '', feedback: e.target.value } }))
                    }
                    className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => handleGrade(s.id)}
                    className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
