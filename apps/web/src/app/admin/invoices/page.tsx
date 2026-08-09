'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface StudentOption {
  id: string;
  enrollmentNo: string;
  user: { email: string };
  department: { code: string };
}
interface InvoiceView {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

const STATUS_TONE: Record<InvoiceView['status'], 'muted' | 'emerald' | 'crimson'> = {
  PENDING: 'muted',
  PAID: 'emerald',
  OVERDUE: 'crimson',
};

export default function AdminInvoicesPage() {
  const { accessToken } = useAuth();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentInvoices, setStudentInvoices] = useState<InvoiceView[]>([]);

  const [form, setForm] = useState({ description: '', amount: '', dueDate: '' });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<StudentOption[]>('/students', { token: accessToken }).then(setStudents).catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    if (!selectedStudentId || !accessToken) return;
    apiFetch<InvoiceView[]>(`/invoices/student/${selectedStudentId}`, { token: accessToken })
      .then(setStudentInvoices)
      .catch(() => setStudentInvoices([]));
  }, [selectedStudentId, accessToken]);

  const departments = [...new Map(students.map((s) => [s.department.code, s.department.code])).values()];
  const filteredStudents = departmentFilter ? students.filter((s) => s.department.code === departmentFilter) : students;
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setStatus(null);
    setError(null);
    if (!selectedStudentId) {
      setError('Choose a student first');
      return;
    }
    try {
      await apiFetch('/invoices', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ studentId: selectedStudentId, ...form, amount: Number(form.amount) }),
      });
      setStatus(`Invoice for ${selectedStudent?.enrollmentNo ?? selectedStudentId} created.`);
      setForm({ description: '', amount: '', dueDate: '' });
      const data = await apiFetch<InvoiceView[]>(`/invoices/student/${selectedStudentId}`, { token: accessToken });
      setStudentInvoices(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create invoice');
    }
  }

  const outstanding = studentInvoices
    .filter((i) => i.status !== 'PAID')
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Finance Office"
        title="Invoices"
        subtitle="Look up a student's account, then issue a new fee invoice against it."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Students on record</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{students.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Selected student</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{selectedStudent ? selectedStudent.enrollmentNo : '—'}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Their outstanding</p>
          <p className="font-serif text-2xl font-semibold text-red-600">Rs. {outstanding.toLocaleString()}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Their invoices</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{studentInvoices.length}</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="ledger-card space-y-3 p-6">
          <p className="font-serif text-base font-semibold text-slate-900">1 · Pick a student</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select a student…</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.enrollmentNo} · {s.user.email}
                </option>
              ))}
            </select>
          </div>
          {selectedStudent && (
            <p className="text-xs text-slate-500">
              Billing <span className="font-data">{selectedStudent.enrollmentNo}</span> ({selectedStudent.department.code}) — {selectedStudent.user.email}
            </p>
          )}
        </div>

        <div className="ledger-card space-y-3 p-6">
          <p className="font-serif text-base font-semibold text-slate-900">2 · Issue an invoice</p>
          <input
            placeholder="Description (e.g. Semester Fee)"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Amount (PKR)"
              type="number"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => update('dueDate', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {status && <p className="text-sm text-green-700">{status}</p>}
          <button
            onClick={handleSubmit}
            disabled={!selectedStudentId || !form.description.trim() || !form.amount}
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
          >
            Create Invoice
          </button>
        </div>
      </div>

      <p className="mb-3 font-serif text-lg font-semibold text-slate-900">Ledger — {selectedStudent ? selectedStudent.enrollmentNo : 'select a student'}</p>
      {!selectedStudent ? (
        <EmptyState title="No student selected" hint="Choose a student above to view their invoices." />
      ) : studentInvoices.length === 0 ? (
        <EmptyState title="No invoices for this student yet" />
      ) : (
        <div className="max-w-2xl space-y-2">
          {studentInvoices.map((inv) => (
            <div key={inv.id} className="ledger-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-slate-900">{inv.description}</p>
                <p className="text-xs text-slate-500">
                  Due {new Date(inv.dueDate).toLocaleDateString()} · Rs. {inv.amount.toLocaleString()}
                </p>
              </div>
              <Ribbon tone={STATUS_TONE[inv.status]}>{inv.status}</Ribbon>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}