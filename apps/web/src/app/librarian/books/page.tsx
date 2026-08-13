'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

type BookForm = {
  title: string;
  author: string;
  isbn: string;
  totalCopies: string;
};

const EMPTY_FORM: BookForm = { title: '', author: '', isbn: '', totalCopies: '' };

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function LibrarianBooksPage() {
  const { accessToken, isLoading: authLoading } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<BookForm>(EMPTY_FORM);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadBooks = useCallback(async () => {
    if (!accessToken) {
      setBooks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Book[]>('/library/books', { token: accessToken });
      setBooks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load the book catalog.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!authLoading) void loadBooks();
  }, [authLoading, loadBooks]);

  function update(field: keyof BookForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setStatus(null);
    setError(null);
  }

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || saving) return;

    const title = form.title.trim();
    const author = form.author.trim();
    const isbn = form.isbn.trim();
    const totalCopies = Number(form.totalCopies);

    if (!title || !author || !isbn) {
      setError('Title, author, and ISBN are required.');
      return;
    }
    if (!Number.isInteger(totalCopies) || totalCopies < 1) {
      setError('Total copies must be a whole number greater than 0.');
      return;
    }

    try {
      setSaving(true);
      setStatus(null);
      setError(null);
      await apiFetch('/library/books', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ title, author, isbn, totalCopies }),
      });
      setStatus(`Added “${title}” to the catalog.`);
      setForm(EMPTY_FORM);
      setShowAdd(false);
      await loadBooks();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add the book.');
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.isbn.toLowerCase().includes(q),
    );
  }, [books, query]);

  const totals = useMemo(() => {
    const totalCopies = books.reduce((sum, book) => sum + safeNumber(book.totalCopies), 0);
    const available = books.reduce((sum, book) => sum + Math.max(0, safeNumber(book.availableCopies)), 0);
    return { totalCopies, available, checkedOut: Math.max(0, totalCopies - available) };
  }, [books]);

  return (
    <main className="w-full min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
      <PageHeader
        eyebrow="Library"
        title="Book Catalog"
        subtitle="Manage the university collection and keep availability accurate."
        action={
          <button
            type="button"
            onClick={() => {
              setShowAdd((value) => !value);
              setStatus(null);
              setError(null);
            }}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
          >
            {showAdd ? 'Close' : '+ Add a Book'}
          </button>
        }
      />

      {status && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p>}
      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Catalog entry</p>
            <h2 className="mt-1 font-serif text-lg font-semibold text-slate-950">Add a new title</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Title</span>
              <input value={form.title} onChange={(e) => update('title', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100" autoComplete="off" />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Author</span>
              <input value={form.author} onChange={(e) => update('author', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100" autoComplete="off" />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">ISBN</span>
              <input value={form.isbn} onChange={(e) => update('isbn', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100" autoComplete="off" />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Total copies</span>
              <input type="number" min={1} step={1} inputMode="numeric" value={form.totalCopies} onChange={(e) => update('totalCopies', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100" />
            </label>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Adding…' : 'Add to Catalog'}</button>
          </div>
        </form>
      )}

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Titles', books.length, 'text-slate-950'],
          ['Total copies', totals.totalCopies, 'text-slate-950'],
          ['On the shelf', totals.available, 'text-emerald-700'],
          ['Out on loan', totals.checkedOut, 'text-red-600'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
            <p className={`mt-1 font-serif text-2xl font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex w-full max-w-2xl items-center gap-2">
        <input type="search" placeholder="Search by title, author, or ISBN…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100" />
        {query && <button type="button" onClick={() => setQuery('')} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50">Clear</button>}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title={books.length === 0 ? 'Catalog is empty' : 'No titles match your search'} hint={books.length === 0 ? 'Use “Add a Book” to start building the collection.' : 'Try a different title, author, or ISBN.'} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((book) => {
            const total = Math.max(0, safeNumber(book.totalCopies));
            const available = Math.min(total, Math.max(0, safeNumber(book.availableCopies)));
            const empty = available === 0;
            const pct = total > 0 ? (available / total) * 100 : 0;
            return (
              <article key={book.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                <div className="mb-2 flex min-w-0 items-start justify-between gap-3">
                  <p className="min-w-0 break-words font-medium text-slate-900">{book.title}</p>
                  <Ribbon tone={empty ? 'crimson' : 'emerald'}>{empty ? '0 available' : `${available} available`}</Ribbon>
                </div>
                <p className="truncate text-sm text-slate-500">{book.author}</p>
                <p className="mb-4 truncate font-data text-xs text-slate-400">ISBN {book.isbn}</p>
                <div className="mb-1 flex justify-between gap-2 text-xs text-slate-500">
                  <span>{total} total {total === 1 ? 'copy' : 'copies'}</span>
                  <span>{Math.round(pct)}% on shelf</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${empty ? 'bg-red-600' : 'bg-emerald-600'}`} style={{ width: `${pct}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
