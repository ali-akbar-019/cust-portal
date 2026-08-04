'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface GenerateResult {
  placedCount: number;
  unplacedSectionIds: string[];
}
interface Department {
  id: string;
  name: string;
  code: string;
}

export default function TimetableGeneratorPage() {
  const { accessToken } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<Department[]>('/departments', { token: accessToken })
      .then(setDepartments)
      .catch(() => {
        /* non-fatal — dropdown just stays empty */
      });
  }, [accessToken]);

  async function handleGenerate() {
    setError(null);
    setResult(null);
    setIsRunning(true);
    try {
      const data = await apiFetch<GenerateResult>(`/timetable/generate?departmentId=${departmentId}`, {
        method: 'POST',
        token: accessToken,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Generation failed');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Timetable Generator</h1>

      <div className="mb-4 flex max-w-md gap-2">
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select department...</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          disabled={isRunning || !departmentId}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isRunning ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="rounded-md border border-slate-200 p-4 text-sm">
          <p className="mb-2">
            <strong>{result.placedCount}</strong> sections placed successfully.
          </p>
          {result.unplacedSectionIds.length > 0 ? (
            <>
              <p className="mb-1 text-red-600">
                {result.unplacedSectionIds.length} section(s) could not be placed — needs manual review:
              </p>
              <ul className="list-inside list-disc text-slate-600">
                {result.unplacedSectionIds.map((id) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-green-600">All sections placed with no conflicts.</p>
          )}
        </div>
      )}
      {/* TODO: resolve unplaced section IDs to course names/codes instead of raw UUIDs */}
    </main>
  );
}
