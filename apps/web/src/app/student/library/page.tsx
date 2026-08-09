'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  availableCopies: number;
  totalCopies: number;
}

type ReservationStatus = 'PENDING' | 'FULFILLED' | 'CANCELLED';

interface Reservation {
  id: string;
  status: ReservationStatus;
  reservedAt: string;
  book: Book;
}

const RES_STATUS_TONE: Record<ReservationStatus, 'gold' | 'emerald' | 'muted'> = {
  PENDING: 'gold',
  FULFILLED: 'emerald',
  CANCELLED: 'muted',
};

export default function StudentLibraryPage() {
  const { accessToken, profile } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    apiFetch<Book[]>('/library/books', { token: accessToken }).then(setBooks).catch(() => {});
    if (profile?.studentId) {
      apiFetch<Reservation[]>(`/library/reservations/mine/${profile.studentId}`, { token: accessToken })
        .then(setReservations)
        .catch(() => {});
    }
  }

  useEffect(load, [accessToken, profile]);

  async function handleReserve(bookId: string) {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/library/reservations', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ bookId }),
      });
      setStatus('Reserved — book held for you at the circulation desk.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reservation failed');
    }
  }

  async function handleCancel(reservationId: string) {
    setStatus(null);
    setError(null);
    try {
      await apiFetch(`/library/reservations/${reservationId}/cancel`, { method: 'POST', token: accessToken });
      setStatus('Reservation cancelled — the copy is back in circulation.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cancel failed');
    }
  }

  async function handleClearanceRequest() {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/library/clearance', { method: 'POST', token: accessToken });
      setStatus('Clearance request submitted — the librarian will review it shortly.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed');
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.toLowerCase().includes(q));
  }, [books, query]);

  const totalCopies = books.reduce((sum, b) => sum + b.totalCopies, 0);
  const availableCopies = books.reduce((sum, b) => sum + b.availableCopies, 0);
  const pendingReservations = reservations.filter((r) => r.status === 'PENDING');

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Library"
        title="Books & Reservations"
        subtitle="Browse the catalog, reserve copies, and request your end-of-term library clearance."
        action={
          <button
            onClick={handleClearanceRequest}
            className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Request Clearance
          </button>
        }
      />

      {status && <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{status}</p>}
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Catalog titles</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{books.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Copies available</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{availableCopies} <span className="text-sm font-normal text-slate-400">/ {totalCopies}</span></p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">My reservations</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{reservations.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pending holds</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{pendingReservations.length}</p>
        </div>
      </div>

      <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">Catalogue</h2>
      <div className="mb-4 max-w-md">
        <input
          type="search"
          placeholder="Search by title, author, or ISBN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={books.length === 0 ? 'Catalog is empty' : 'No books match your search'} hint={books.length === 0 ? 'Check back soon — new titles are added every term.' : undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => {
            const empty = b.availableCopies <= 0;
            const pct = b.totalCopies > 0 ? b.availableCopies / b.totalCopies : 0;
            return (
              <div key={b.id} className={`ledger-card p-5 ${empty ? 'opacity-70' : ''}`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">{b.title}</p>
                  <Ribbon tone={empty ? 'muted' : 'emerald'}>{empty ? 'Checked out' : 'Available'}</Ribbon>
                </div>
                <p className="text-sm text-slate-500">{b.author}</p>
                <p className="mb-3 font-data text-xs text-slate-400">ISBN {b.isbn}</p>
                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>{b.availableCopies} copy{b.availableCopies === 1 ? '' : 's'} on shelf</span>
                    <span>{Math.round(pct * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${empty ? 'bg-slate-300' : 'bg-green-600'}`}
                      style={{ width: `${(b.availableCopies / b.totalCopies) * 100}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleReserve(b.id)}
                  disabled={empty}
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
                >
                  {empty ? 'Unavailable' : 'Reserve a Copy'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {reservations.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-serif text-lg font-semibold text-slate-900">My Reservations</h2>
          <div className="max-w-2xl space-y-2">
            {reservations.map((r) => (
              <div key={r.id} className="ledger-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{r.book.title}</p>
                  <p className="text-xs text-slate-500">
                    {r.book.author} · reserved {new Date(r.reservedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Ribbon tone={RES_STATUS_TONE[r.status]}>{r.status.toLowerCase()}</Ribbon>
                  {r.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:border-red-600 hover:text-red-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}