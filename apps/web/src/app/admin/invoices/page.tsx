'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { AdminButton, AdminField, AdminMessage, AdminPill, AdminSectionHeading, AdminStat, AdminSurface, inputClass, selectClass } from '../_components/admin-ui';

interface StudentOption { id: string; enrollmentNo: string; user: { email: string }; department: { code: string }; }
interface InvoiceView { id: string; description: string; amount: number; dueDate: string; status: 'PENDING' | 'PAID' | 'OVERDUE'; }

const money = (amount: number) => `Rs. ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminInvoicesPage() {
  const { accessToken } = useAuth();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentInvoices, setStudentInvoices] = useState<InvoiceView[]>([]);
  const [form, setForm] = useState({ description: '', amount: '', dueDate: '' });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<StudentOption[]>('/students', { token: accessToken }).then(setStudents).catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load students'));
  }, [accessToken]);

  useEffect(() => {
    if (!selectedStudentId || !accessToken) {
      setStudentInvoices([]);
      return;
    }
    apiFetch<InvoiceView[]>(`/invoices/student/${selectedStudentId}`, { token: accessToken })
      .then(setStudentInvoices)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load invoices'));
  }, [selectedStudentId, accessToken]);

  const departments = useMemo(() => [...new Set(students.map((s) => s.department.code))], [students]);
  const filteredStudents = useMemo(() => departmentFilter ? students.filter((s) => s.department.code === departmentFilter) : students, [students, departmentFilter]);
  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const outstanding = studentInvoices.filter((i) => i.status !== 'PAID').reduce((sum, i) => sum + i.amount, 0);

  function update(field: keyof typeof form, value: string) { setForm((prev) => ({ ...prev, [field]: value })); }

  async function handleSubmit() {
    setStatus(null); setError(null);
    if (!selectedStudentId) { setError('Choose a student first.'); return; }
    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0 || !form.dueDate) { setError('Enter a description, a valid amount, and a due date.'); return; }
    setSaving(true);
    try {
      await apiFetch('/invoices', { method: 'POST', token: accessToken, body: JSON.stringify({ studentId: selectedStudentId, description: form.description.trim(), amount, dueDate: form.dueDate }) });
      setStatus(`Invoice for ${selectedStudent?.enrollmentNo ?? selectedStudentId} created.`);
      setForm({ description: '', amount: '', dueDate: '' });
      const data = await apiFetch<InvoiceView[]>(`/invoices/student/${selectedStudentId}`, { token: accessToken });
      setStudentInvoices(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create invoice');
    } finally { setSaving(false); }
  }

  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">
      <PageHeader eyebrow="Finance Office" title="Invoices" subtitle="Select a student, review their ledger, and issue a new fee invoice." />

      <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStat label="Students" value={students.length} detail="Available accounts" />
        <AdminStat label="Selected" value={selectedStudent?.enrollmentNo ?? '—'} />
        <AdminStat label="Outstanding" value={selectedStudent ? money(outstanding) : '—'} />
        <AdminStat label="Invoices" value={selectedStudent ? studentInvoices.length : '—'} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AdminSurface className="p-5 sm:p-6">
          <AdminSectionHeading title="1. Select student" subtitle="Filter by department, then choose the account." />
          <div className="space-y-4">
            <AdminField label="Department">
              <select className={selectClass} value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setSelectedStudentId(''); }}>
                <option value="">All departments</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </AdminField>
            <AdminField label="Student">
              <select className={selectClass} value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                <option value="">Select a student…</option>
                {filteredStudents.map((s) => <option key={s.id} value={s.id}>{s.enrollmentNo} · {s.user.email}</option>)}
              </select>
            </AdminField>
            {selectedStudent && <div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="font-medium text-slate-900">{selectedStudent.enrollmentNo}</p><p className="mt-1 text-xs text-slate-500">{selectedStudent.department.code} · {selectedStudent.user.email}</p></div>}
          </div>
        </AdminSurface>

        <AdminSurface className="p-5 sm:p-6">
          <AdminSectionHeading title="2. Issue invoice" subtitle="Create a new charge against the selected student." />
          <div className="space-y-4">
            <AdminField label="Description"><input className={inputClass} placeholder="Semester Fee" value={form.description} onChange={(e) => update('description', e.target.value)} /></AdminField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AdminField label="Amount (PKR)"><input className={inputClass} type="number" min="0" step="0.01" inputMode="decimal" placeholder="50000.00" value={form.amount} onChange={(e) => update('amount', e.target.value)} /></AdminField>
              <AdminField label="Due date"><input className={inputClass} type="date" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} /></AdminField>
            </div>
            {error && <AdminMessage tone="error">{error}</AdminMessage>}
            {status && <AdminMessage tone="success">{status}</AdminMessage>}
            <AdminButton onClick={handleSubmit} disabled={saving || !selectedStudentId || !form.description.trim() || !form.amount || !form.dueDate} className="w-full sm:w-auto">{saving ? 'Creating…' : 'Create invoice'}</AdminButton>
          </div>
        </AdminSurface>
      </div>

      <AdminSectionHeading title="Student ledger" subtitle={selectedStudent ? `${selectedStudent.enrollmentNo} · ${studentInvoices.length} invoice${studentInvoices.length === 1 ? '' : 's'}` : 'Select a student to view their invoices'} />
      {!selectedStudent ? (
        <EmptyState title="No student selected" hint="Choose a student above to view their invoice history." />
      ) : studentInvoices.length === 0 ? (
        <EmptyState title="No invoices yet" hint="Create the first invoice using the form above." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {studentInvoices.map((inv) => (
            <AdminSurface key={inv.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><p className="font-medium text-slate-950">{inv.description}</p><p className="mt-1 text-xs text-slate-500">Due {new Date(inv.dueDate).toLocaleDateString()}</p></div>
                <AdminPill tone={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'warning'}>{inv.status}</AdminPill>
              </div>
              <p className="mt-4 font-data text-lg font-semibold text-slate-900">{money(inv.amount)}</p>
            </AdminSurface>
          ))}
        </div>
      )}
    </main>
  );
}
