'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { AdminButton, AdminField, AdminMessage, AdminPill, AdminSectionHeading, AdminSurface, inputClass } from '../_components/admin-ui';

interface Department { id: string; name: string; code: string; dayStartTime: string | null; dayEndTime: string | null; }

export default function AdminDepartmentsPage() {
  const { accessToken } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState({ name: '', code: '', dayStartTime: '', dayEndTime: '' });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    if (!accessToken) return;
    apiFetch<Department[]>('/departments', { token: accessToken }).then(setDepartments).catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load departments'));
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
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">
      <PageHeader eyebrow="Academic Structure" title="Departments" subtitle="Configure academic departments and the class-day window used by timetable generation." />

      <div className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <AdminSurface className="p-5 sm:p-6">
          <AdminSectionHeading title="Add department" subtitle="Create the academic unit first; courses and users can be added afterward." />
          <div className="space-y-4">
            <AdminField label="Full name">
              <input className={inputClass} placeholder="Computer Science" value={form.name} onChange={(e) => update('name', e.target.value)} />
            </AdminField>
            <AdminField label="Department code" hint="Use the short code students recognize, such as CS or SE.">
              <input className={`${inputClass} font-data uppercase`} maxLength={8} placeholder="CS" value={form.code} onChange={(e) => update('code', e.target.value)} />
            </AdminField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AdminField label="Class day starts">
                <input type="time" className={inputClass} value={form.dayStartTime} onChange={(e) => update('dayStartTime', e.target.value)} />
              </AdminField>
              <AdminField label="Class day ends">
                <input type="time" className={inputClass} value={form.dayEndTime} onChange={(e) => update('dayEndTime', e.target.value)} />
              </AdminField>
            </div>
            {error && <AdminMessage tone="error">{error}</AdminMessage>}
            {status && <AdminMessage tone="success">{status}</AdminMessage>}
            <AdminButton onClick={handleAdd} disabled={saving || !form.name.trim() || !form.code.trim()} className="w-full sm:w-auto">
              {saving ? 'Creating…' : 'Add department'}
            </AdminButton>
          </div>
        </AdminSurface>

        <AdminSurface className="p-5 sm:p-6">
          <AdminSectionHeading title="Current departments" subtitle={`${departments.length} configured`} />
          {departments.length === 0 ? (
            <EmptyState title="No departments yet" hint="Create the first department using the form." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {departments.map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-950">{d.name}</p>
                      <p className="mt-1 text-xs text-slate-400">Class window</p>
                    </div>
                    <AdminPill tone="dark">{d.code}</AdminPill>
                  </div>
                  <p className="mt-3 font-data text-xs text-slate-600">
                    {d.dayStartTime ? `${d.dayStartTime} – ${d.dayEndTime ?? 'open'}` : 'Not configured'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </AdminSurface>
      </div>
    </main>
  );
}
