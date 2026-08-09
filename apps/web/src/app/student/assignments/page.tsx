'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface MySection {
  id: string;
  course: { title: string; code: string };
}
interface AssignmentView {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  fileUrl: string | null;
}

export default function StudentAssignmentsPage() {
  const { accessToken, profile } = useAuth();
  const [mySections, setMySections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<MySection[]>(`/students/${profile.studentId}/sections`, { token: accessToken })
      .then((sections) => {
        setMySections(sections);
        if (sections.length > 0) setSectionId(sections[0].id);
      })
      .catch(() => {});
  }, [accessToken, profile]);

  async function load() {
    if (!sectionId || !accessToken) return;
    setError(null);
    try {
      const data = await apiFetch<AssignmentView[]>(`/assignments/section/${sectionId}`, { token: accessToken });
      setAssignments(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load assignments');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, accessToken]);

  async function handleSubmit(assignmentId: string, file: File) {
    setStatus(null);
    setError(null);
    setUploadingFor(assignmentId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/assignments/upload`,
        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData },
      );
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { fileUrl } = await uploadRes.json();

      await apiFetch(`/assignments/${assignmentId}/submit`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ fileUrl }),
      });
      setStatus('Submitted successfully.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed — check the deadline hasn't passed");
    } finally {
      setUploadingFor(null);
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Assignments</h1>

      <div className="mb-4 max-w-md">
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {mySections.length === 0 && <option value="">No enrolled courses yet</option>}
          {mySections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.course.title} ({s.course.code})
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {status && <p className="mb-3 text-sm text-green-600">{status}</p>}
      {assignments.length === 0 && sectionId && <p className="text-sm text-slate-500">No assignments posted for this course yet.</p>}

      <div className="max-w-xl space-y-3">
        {assignments.map((a) => {
          const isPastDue = new Date(a.deadline) < new Date();
          return (
            <div key={a.id} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium">{a.title}</p>
                <span className={`text-xs ${isPastDue ? 'text-red-600' : 'text-slate-400'}`}>
                  Due {new Date(a.deadline).toLocaleString()}
                </span>
              </div>
              {a.description && <p className="mb-2 text-sm text-slate-600">{a.description}</p>}
              <input
                type="file"
                disabled={isPastDue || uploadingFor === a.id}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSubmit(a.id, file);
                }}
                className="text-sm"
              />
              {isPastDue && <p className="mt-1 text-xs text-red-500">Deadline has passed — submissions closed.</p>}
            </div>
          );
        })}
      </div>
    </main>
  );
}
