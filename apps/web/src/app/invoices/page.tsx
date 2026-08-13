'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Ribbon } from '@/components/ui/ribbon';
import { NotificationBell } from '@/components/ui/notification-bell';

interface InvoiceView {
  id: string;
  invoiceNo: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending';
  description: string | null;
}

interface InvoiceDetail {
  id: string;
  invoiceNo: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending';
  createdAt: string;
  paidAt: string | null;
  description: string | null;
}

export default function InvoicesPage() {
  const { accessToken, profile } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [selected, setSelected] = useState<InvoiceView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<InvoiceView[]>(`/invoices?studentId=${profile.studentId}`, { token: accessToken })
      .then(setInvoices)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load invoices');
      });
  }, [accessToken, profile]);

  const filtered = invoices.filter((inv) => {
    if (statusFilter === 'all') return true;
    return inv.status === statusFilter;
  });

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    pending: invoices.filter((i) => i.status === 'pending').length,
  };

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        subtitle="View and manage your invoices and payments."
      />

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <StatCard
            label="Total"
            value={String(stats.total)}
            hint="All invoices"
          />
          <StatCard
            label="Paid"
            value={String(stats.paid)}
            hint="Paid invoices"
          />
          <StatCard
            label="Pending"
            value={String(stats.pending)}
            hint="Unpaid invoices"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && sectionId && (
              <EmptyState
                title="No invoices posted for this course yet"
                hint="Check back after the billing cycle ends."
              )
            )}
            {filtered.map((inv) => (
              <tr
                key={inv.id}
                className="hover:bg-slate-50 cursor-pointer"
                onClick={() => setSelected(inv)}
              >
                <td className="px-4 py-3 font-medium text-slate-900">{inv.invoiceNo}</td>
                <td className="px-4 py-3 font-medium text-slate-900">${inv.amount}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Ribbon
                    tone={inv.status === 'paid' ? 'crimson' : 'navy'}
                    className="text-[10px]"
                  >
                    {inv.status}
                  </Ribbon>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(inv);
                    }}
                    className="underline text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-6"
          onClick={(e) => e.target === e.currentTarget ? setSelected(null) : null}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-detail-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <path d="M7 22h10" />
                  <path d="M7 12h5" />
                  <circle cx="7" cy="7" r="4" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div>
                <h2 id="invoice-detail-title" className="font-serif text-2xl font-semibold text-slate-900">
                  {selected.invoiceNo}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selected.dueDate ? 'Due ' + new Date(selected.dueDate).toLocaleDateString() : 'No due date'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Amount</p>
                <p className="font-serif text-3xl font-bold text-slate-900">${selected.amount}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <Ribbon
                  tone={selected.status === 'paid' ? 'crimson' : 'navy'}
                  className="text-[10px]"
                >
                  {selected.status}
                </Ribbon>
              </div>
            </div>

            {selected.description && (
              <p className="mt-4 text-sm text-slate-600">{selected.description}</p>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setSelected(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}