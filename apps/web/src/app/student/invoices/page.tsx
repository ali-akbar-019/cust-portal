'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';

interface InvoiceView { id: string; description: string; amount: number; dueDate: string; issuedAt: string; paidAt: string | null; status: 'PENDING' | 'PAID' | 'OVERDUE' }
const card = 'rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm';
const fmtPKR = (n: number) => `Rs. ${n.toLocaleString('en-PK')}`;

export default function StudentInvoicesPage() {
  const { accessToken, profile } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function load() {
    if (!accessToken || !profile?.studentId) return;
    try {
      const data = await apiFetch<InvoiceView[]>(`/invoices/student/${profile.studentId}`, { token: accessToken });
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load invoices');
    }
  }

  useEffect(() => { void load(); }, [accessToken, profile?.studentId]);

  async function handlePay(id: string) {
    if (!accessToken || payingId) return;
    setPayingId(id);
    setError(null);
    try {
      await apiFetch(`/invoices/${id}/pay`, { method: 'POST', token: accessToken });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Payment failed');
    } finally {
      setPayingId(null);
    }
  }

  const paid = invoices.filter((invoice) => invoice.status === 'PAID');
  const pending = invoices.filter((invoice) => invoice.status === 'PENDING');
  const overdue = invoices.filter((invoice) => invoice.status === 'OVERDUE');
  const outstandingAmount = [...pending, ...overdue].reduce((sum, invoice) => sum + invoice.amount, 0);
  const paidAmount = paid.reduce((sum, invoice) => sum + invoice.amount, 0);

  const sortedInvoices = useMemo(() => [...invoices].sort((a, b) => {
    const rank = (status: InvoiceView['status']) => status === 'OVERDUE' ? 0 : status === 'PENDING' ? 1 : 2;
    return rank(a.status) - rank(b.status) || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }), [invoices]);

  const daysUntil = (due: string) => Math.ceil((new Date(due).getTime() - Date.now()) / 864e5);

  return (
    <main className="min-w-0 overflow-x-hidden bg-slate-50/50 p-4 sm:p-6 lg:p-8 xl:p-10">
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader eyebrow="Finance Office" title="Invoices" subtitle="Review your fee invoices, due dates, and outstanding balance." />

        {error && <div className="mb-5 mt-7 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className={`${card} mb-7 mt-7 overflow-hidden`}>
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
            <div className="p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Outstanding</p><p className="mt-2 font-data text-xl font-semibold text-slate-900 sm:text-2xl">{fmtPKR(outstandingAmount)}</p></div>
            <div className="p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Paid to date</p><p className="mt-2 font-data text-xl font-semibold text-slate-900 sm:text-2xl">{fmtPKR(paidAmount)}</p></div>
            <div className="p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Pending</p><p className="mt-2 font-data text-2xl font-semibold text-slate-900">{pending.length}</p></div>
            <div className="p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Overdue</p><p className="mt-2 font-data text-2xl font-semibold text-slate-900">{overdue.length}</p></div>
          </div>
        </section>

        {sortedInvoices.length === 0 ? <EmptyState title="No invoices issued yet" hint="Bills from the finance office will appear here once issued." /> : <div className="space-y-3">{sortedInvoices.map((invoice) => {
          const dueIn = daysUntil(invoice.dueDate);
          const paidInvoice = invoice.status === 'PAID';
          return <article key={invoice.id} className={`${card} p-4 sm:p-5`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-slate-900 sm:text-base">{invoice.description}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${paidInvoice ? 'bg-slate-100 text-slate-500' : 'bg-slate-900 text-white'}`}>{paidInvoice ? 'Paid' : invoice.status === 'OVERDUE' ? 'Overdue' : 'Pending'}</span></div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400"><span>Issued {new Date(invoice.issuedAt).toLocaleDateString()}</span><span>Due {new Date(invoice.dueDate).toLocaleDateString()}</span>{paidInvoice && invoice.paidAt && <span>Paid {new Date(invoice.paidAt).toLocaleDateString()}</span>}{!paidInvoice && <span className={dueIn < 0 ? 'text-slate-600' : 'text-slate-500'}>{dueIn < 0 ? `${Math.abs(dueIn)} day${Math.abs(dueIn) === 1 ? '' : 's'} overdue` : dueIn === 0 ? 'Due today' : `Due in ${dueIn} day${dueIn === 1 ? '' : 's'}`}</span>}</div>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end"><p className="font-data text-lg font-semibold text-slate-900">{fmtPKR(invoice.amount)}</p>{!paidInvoice && <button type="button" onClick={() => void handlePay(invoice.id)} disabled={payingId !== null} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40">{payingId === invoice.id ? 'Processing…' : 'Pay now'}</button>}</div>
            </div>
          </article>;
        })}</div>}

        <p className="mt-6 text-xs leading-5 text-slate-400">Payments currently simulate settlement inside the portal; no external payment gateway is connected.</p>
      </div>
    </main>
  );
}
