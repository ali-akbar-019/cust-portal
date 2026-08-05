'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

export default function AdminInvoicesPage() {
  const { accessToken } = useAuth();
  const [form, setForm] = useState({ studentId: '', description: '', amount: '', dueDate: '' });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/invoices', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      setStatus('Invoice created.');
      setForm({ studentId: form.studentId, description: '', amount: '', dueDate: '' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create invoice');
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Create Invoice</h1>
      <div className="max-w-sm space-y-3">
        <input
          placeholder="Student ID"
          value={form.studentId}
          onChange={(e) => update('studentId', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Description (e.g. Semester Fee)"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        {status && <p className="text-sm text-green-600">{status}</p>}
        <button onClick={handleSubmit} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Create Invoice
        </button>
      </div>
    </main>
  );
}
