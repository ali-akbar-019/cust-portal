'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface InvoiceView {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

const STATUS_STYLE: Record<InvoiceView['status'], string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

export default function StudentInvoicesPage() {
  const { accessToken } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    // TODO: derive the student's own id from /students/me once that endpoint exists
    apiFetch<InvoiceView[]>('/invoices/student/PLACEHOLDER_STUDENT_ID', { token: accessToken })
      .then(setInvoices)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load invoices'));
  }

  useEffect(load, [accessToken]);

  async function handlePay(id: string) {
    setError(null);
    try {
      await apiFetch(`/invoices/${id}/pay`, { method: 'POST', token: accessToken });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Payment failed');
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Invoices</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="max-w-xl space-y-3">
        {invoices.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="font-medium">{inv.description}</p>
              <p className="text-xs text-slate-500">
                Due {new Date(inv.dueDate).toLocaleDateString()} · Rs. {inv.amount.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded px-2 py-1 text-xs ${STATUS_STYLE[inv.status]}`}>{inv.status}</span>
              {inv.status !== 'PAID' && (
                <button
                  onClick={() => handlePay(inv.id)}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white"
                >
                  Pay
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* NOTE: "Pay" just marks the invoice as paid client-side triggered —
          there's no real payment gateway. See InvoicesService.pay's comment. */}
    </main>
  );
}
