'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

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
    apiFetch<Department[]>('/departments', { token: accessToken }).then(setDepartments).catch(() => {});
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

  const selectedDept = departments.find((d) => d.id === departmentId);

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Scheduling Office"
        title="Timetable Generator"
        subtitle="Automatically place every section of a department across available rooms and time slots — respecting room capacity, room type, and teacher conflicts."
      />

      <div className="ledger-card mb-8 max-w-xl space-y-3 p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Department</span>
          <div className="flex gap-2">
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={isRunning || !departmentId}
              className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
            >
              {isRunning ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </label>
        <p className="text-xs text-slate-400">
          {selectedDept
            ? `Generator will place all of ${selectedDept.name}'s sections for the current catalog.`
            : 'Pick a department — an existing generated timetable will be replaced in-place for that department.'}
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {result && (
        <div className="max-w-xl">
          <p className="mb-3 font-serif text-base font-semibold text-slate-900">Generation result — {selectedDept?.code}</p>
          <div className="mb-4 flex gap-2">
            <Ribbon tone={result.unplacedSectionIds.length === 0 ? 'emerald' : 'gold'}>
              {result.placedCount} placed
            </Ribbon>
            {result.unplacedSectionIds.length > 0 && <Ribbon tone="crimson">{result.unplacedSectionIds.length} unresolved</Ribbon>}
          </div>
          <div className={`rounded-lg border p-5 text-sm ${result.unplacedSectionIds.length > 0 ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white'}`}>
            {result.unplacedSectionIds.length === 0 ? (
              <p className="text-green-700">All sections placed successfully with no remaining conflicts.</p>
            ) : (
              <>
                <p className="mb-2 text-slate-700">
                  {result.placedCount} sections placed, but {result.unplacedSectionIds.length} could not be scheduled without a conflict. These need manual attention — free up a room or time window and run again.
                </p>
                <ul className="list-inside list-disc space-y-1 text-slate-600">
                  {result.unplacedSectionIds.map((id) => (
                    <li key={id} className="font-data text-xs">{id}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}