'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface Department {
  id: string;
  name: string;
  code: string;
  dayStartTime: string | null;
  dayEndTime: string | null;
}

export default function AdminDepartmentsPage() {
  const { accessToken } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState({ name: '', code: '', dayStartTime: '', dayEndTime: '' });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    if (!accessToken) return;
    apiFetch<Department[]>('/departments', { token: accessToken }).then(setDepartments).catch(() => {});
  }
  useEffect(load, [accessToken]);

  function update(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleAdd() {
    setStatus(null);
    setError(null);
    setSaving(true);
    try {
      const created = await apiFetch<Department>('/departments', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          dayStartTime: form.dayStartTime || undefined,
          dayEndTime: form.dayEndTime || undefined,
        }),
      });
      setStatus(`Created ${created.code} — ${created.name}.`);
      setForm({ name: '', code: '', dayStartTime: '', dayEndTime: '' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create department');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Academic Structure"
        title="Departments"
        subtitle="The university's departments. New ones start with no courses or students — build those up from Manage Users and the timetable."
      />

      {status && <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{status}</p>}
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="ledger-card mb-8 max-w-xl space-y-3 p-6">
        <p className="font-serif text-base font-semibold text-slate-900">Add a department</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Full name</span>
            <input
              placeholder="e.g. Computer Science"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Code</span>
            <input
              placeholder="e.g. CS"
              value={form.code}
              onChange={(e) => update('code', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Class day start</span>
            <input
              type="time"
              value={form.dayStartTime}
              onChange={(e) => update('dayStartTime', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Class day end</span>
            <input
              type="time"
              value={form.dayEndTime}
              onChange={(e) => update('dayEndTime', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleAdd}
          disabled={saving || !form.name.trim() || !form.code.trim()}
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
        >
          {saving ? 'Creating...' : 'Add Department'}
        </button>
        <p className="text-xs text-slate-400">The day-start/end window feeds the timetable generator's hour grid for this department.</p>
      </div>

      <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">
        All Departments <span className="text-sm font-normal text-slate-400">({departments.length})</span>
      </h2>
      {departments.length === 0 ? (
        <EmptyState title="No departments yet" hint="Add the first one above — it'll appear here." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <div key={d.id} className="ledger-card p-5">
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="font-medium text-slate-900">{d.name}</p>
                <Ribbon tone="navy">{d.code}</Ribbon>
              </div>
              <p className="mt-3 font-data text-xs text-slate-400">
                Class window: {d.dayStartTime ? `${d.dayStartTime} – ${d.dayEndTime ?? 'late'}` : 'Not set'}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}