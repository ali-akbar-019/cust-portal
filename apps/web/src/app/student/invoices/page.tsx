'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface InvoiceView {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  issuedAt: string;
  paidAt: string | null;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

const STATUS_TONE: Record<InvoiceView['status'], 'muted' | 'emerald' | 'crimson'> = {
  PENDING: 'muted',
  PAID: 'emerald',
  OVERDUE: 'crimson',
};

const fmtPKR = (n: number) => `Rs. ${n.toLocaleString()}`;

export default function StudentInvoicesPage() {
  const { accessToken, profile } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<InvoiceView[]>(`/invoices/student/${profile.studentId}`, { token: accessToken })
      .then(setInvoices)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load invoices'));
  }

  useEffect(load, [accessToken, profile]);

  async function handlePay(id: string) {
    setError(null);
    try {
      await apiFetch(`/invoices/${id}/pay`, { method: 'POST', token: accessToken });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Payment failed');
    }
  }

  const paid = invoices.filter((i) => i.status === 'PAID');
  const pending = invoices.filter((i) => i.status === 'PENDING');
  const overdue = invoices.filter((i) => i.status === 'OVERDUE');
  const outstandingAmount = [...pending, ...overdue].reduce((sum, i) => sum + i.amount, 0);
  const paidAmount = paid.reduce((sum, i) => sum + i.amount, 0);

  const daysUntil = (due: string) => {
    const diff = new Date(due).getTime() - Date.now();
    return Math.ceil(diff / 864e5);
  };

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Finance Office"
        title="Invoices"
        subtitle="Your fee invoices and financial account. Outstanding bills are shown first."
      />

      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Outstanding balance</p>
          <p className={`font-serif text-2xl font-semibold ${outstandingAmount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{fmtPKR(outstandingAmount)}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Paid to date</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{fmtPKR(paidAmount)}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Due soon</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{pending.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Overdue</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{overdue.length}</p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <EmptyState title="No invoices issued yet" hint="Bills from the finance office will appear here once issued." />
      ) : (
        <div className="max-w-2xl space-y-3">
          {[...invoices]
            .sort((a, b) => (a.status === 'PAID' ? 1 : 0) - (b.status === 'PAID' ? 1 : 0))
            .map((inv) => {
              const dueIn = daysUntil(inv.dueDate);
              return (
                <div key={inv.id} className="ledger-card p-5">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{inv.description}</p>
                    <Ribbon tone={STATUS_TONE[inv.status]}>{inv.status}</Ribbon>
                  </div>
                  <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="font-data text-base font-semibold text-slate-900">{fmtPKR(inv.amount)}</span>
                    <span>
                      Due {new Date(inv.dueDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      {inv.status !== 'PAID' && dueIn >= 0 && (
                        <span className="ml-1 text-slate-400">({dueIn === 0 ? 'today' : `in ${dueIn} day${dueIn === 1 ? '' : 's'}`})</span>
                      )}
                      {inv.status !== 'PAID' && dueIn < 0 && <span className="ml-1 text-red-600">({Math.abs(dueIn)} day{Math.abs(dueIn) === 1 ? '' : 's'} late)</span>}
                    </span>
                    {inv.paidAt && <span className="text-green-700">Paid {new Date(inv.paidAt).toLocaleDateString()}</span>}
                  </div>
                  {inv.status !== 'PAID' && (
                    <button
                      onClick={() => handlePay(inv.id)}
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Note: paying an invoice simulates settlement within the portal — no external payment gateway is connected.
      </p>
    </main>
  );
}