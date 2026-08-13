'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';

interface Book { id: string; title: string; author: string; isbn: string; availableCopies: number; totalCopies: number }
type ReservationStatus = 'PENDING' | 'FULFILLED' | 'CANCELLED';
interface Reservation { id: string; status: ReservationStatus; reservedAt: string; book: Book }
const card = 'rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm';

export default function StudentLibraryPage() {
  const { accessToken, profile } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    if (!accessToken) return;
    try {
      const bookData = await apiFetch<Book[]>('/library/books', { token: accessToken });
      setBooks(Array.isArray(bookData) ? bookData : []);
      if (profile?.studentId) {
        const reservationData = await apiFetch<Reservation[]>(`/library/reservations/mine/${profile.studentId}`, { token: accessToken });
        setReservations(Array.isArray(reservationData) ? reservationData : []);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load library');
    }
  }

  useEffect(() => { void load(); }, [accessToken, profile?.studentId]);

  async function handleReserve(bookId: string) {
    if (!accessToken || busyId) return;
    setBusyId(bookId); setStatus(null); setError(null);
    try { await apiFetch('/library/reservations', { method: 'POST', token: accessToken, body: JSON.stringify({ bookId }) }); setStatus('Book reserved successfully.'); await load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Reservation failed'); }
    finally { setBusyId(null); }
  }

  async function handleCancel(id: string) {
    if (!accessToken || busyId) return;
    setBusyId(id); setStatus(null); setError(null);
    try { await apiFetch(`/library/reservations/${id}/cancel`, { method: 'POST', token: accessToken }); setStatus('Reservation cancelled.'); await load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Cancel failed'); }
    finally { setBusyId(null); }
  }

  async function handleClearanceRequest() {
    if (!accessToken || busyId) return;
    setBusyId('clearance'); setStatus(null); setError(null);
    try { await apiFetch('/library/clearance', { method: 'POST', token: accessToken }); setStatus('Clearance request submitted.'); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Request failed'); }
    finally { setBusyId(null); }
  }

  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return q ? books.filter((book) => [book.title, book.author, book.isbn].some((value) => value.toLowerCase().includes(q))) : books; }, [books, query]);
  const totalCopies = books.reduce((sum, book) => sum + book.totalCopies, 0);
  const availableCopies = books.reduce((sum, book) => sum + book.availableCopies, 0);
  const pendingReservations = reservations.filter((reservation) => reservation.status === 'PENDING');

  return (
    <main className="min-w-0 overflow-x-hidden bg-slate-50/50 p-4 sm:p-6 lg:p-8 xl:p-10">
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader eyebrow="Library" title="Books & Reservations" subtitle="Browse the catalogue, reserve available copies, and manage your library holds." action={<button type="button" onClick={() => void handleClearanceRequest()} disabled={busyId !== null} className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40 sm:w-auto">{busyId === 'clearance' ? 'Submitting…' : 'Request clearance'}</button>} />

        {(error || status) && <div className={`mb-5 mt-7 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600'}`}>{error ?? status}</div>}

        <section className={`${card} mb-7 mt-7 overflow-hidden`}><div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0"><div className="p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Titles</p><p className="mt-2 font-data text-2xl font-semibold text-slate-900">{books.length}</p></div><div className="p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Available</p><p className="mt-2 font-data text-2xl font-semibold text-slate-900">{availableCopies}<span className="text-xs font-normal text-slate-400"> / {totalCopies}</span></p></div><div className="p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Reservations</p><p className="mt-2 font-data text-2xl font-semibold text-slate-900">{reservations.length}</p></div><div className="p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Pending holds</p><p className="mt-2 font-data text-2xl font-semibold text-slate-900">{pendingReservations.length}</p></div></div></section>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Catalogue</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Find a book</h2></div><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, author or ISBN" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 sm:max-w-sm" /></div>

        {filtered.length === 0 ? <EmptyState title={books.length === 0 ? 'Catalogue is empty' : 'No books match your search'} hint={books.length === 0 ? 'Check back later for newly added titles.' : undefined} /> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((book) => { const empty = book.availableCopies <= 0; const ratio = book.totalCopies > 0 ? Math.min(1, book.availableCopies / book.totalCopies) : 0; return <article key={book.id} className={`${card} p-4 sm:p-5 ${empty ? 'opacity-75' : ''}`}><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-data text-[10px] font-bold text-white">BK</div><div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{book.title}</h3><p className="mt-1 text-xs text-slate-500">{book.author}</p></div></div><p className="mt-4 font-data text-[10px] text-slate-400">ISBN {book.isbn}</p><div className="mt-4"><div className="mb-1.5 flex justify-between text-[11px] text-slate-400"><span>{book.availableCopies} of {book.totalCopies} available</span><span>{Math.round(ratio * 100)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${ratio * 100}%` }} /></div></div><button type="button" onClick={() => void handleReserve(book.id)} disabled={empty || busyId !== null} className="mt-4 w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{busyId === book.id ? 'Reserving…' : empty ? 'Unavailable' : 'Reserve copy'}</button></article>; })}</div>}

        {reservations.length > 0 && <section className="mt-9"><div className="mb-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Your activity</p><h2 className="mt-1 text-lg font-semibold text-slate-900">My reservations</h2></div><div className="space-y-3">{reservations.map((reservation) => <article key={reservation.id} className={`${card} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{reservation.book.title}</p><p className="mt-1 text-xs text-slate-400">{reservation.book.author} · reserved {new Date(reservation.reservedAt).toLocaleDateString()}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{reservation.status.toLowerCase()}</span>{reservation.status === 'PENDING' && <button type="button" onClick={() => void handleCancel(reservation.id)} disabled={busyId !== null} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:opacity-40">{busyId === reservation.id ? 'Cancelling…' : 'Cancel'}</button>}</div></article>)}</div></section>}
      </div>
    </main>
  );
}
