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

export default function LibrarianBooksPage() {
  const { accessToken } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', totalCopies: '' });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    apiFetch<Book[]>('/library/books', { token: accessToken }).then(setBooks).catch(() => {});
  }
  useEffect(load, [accessToken]);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAdd() {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/library/books', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ ...form, totalCopies: Number(form.totalCopies) }),
      });
      setStatus(`Added "${form.title}" to the catalog.`);
      setForm({ title: '', author: '', isbn: '', totalCopies: '' });
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add book');
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.toLowerCase().includes(q));
  }, [books, query]);

  const checkedOut = books.reduce((s, b) => s + (b.totalCopies - b.availableCopies), 0);

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Library"
        title="Book Catalog"
        subtitle="The university's collection. Keep availability honest — reservations decrement the on-shelf count automatically."
        action={
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            {showAdd ? 'Close' : '+ Add a Book'}
          </button>
        }
      />

      {status && <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{status}</p>}
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {showAdd && (
        <div className="ledger-card mb-8 max-w-md space-y-3 p-6">
          <p className="font-serif text-base font-semibold text-slate-900">New title</p>
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              placeholder="Author"
              value={form.author}
              onChange={(e) => update('author', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="ISBN"
              value={form.isbn}
              onChange={(e) => update('isbn', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Total copies</span>
            <input
              placeholder="3"
              type="number"
              min={1}
              value={form.totalCopies}
              onChange={(e) => update('totalCopies', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            onClick={handleAdd}
            disabled={!form.title.trim() || !form.author.trim() || !form.isbn.trim() || !form.totalCopies}
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            Add to Catalog
          </button>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Titles</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{books.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total copies</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{books.reduce((s, b) => s + b.totalCopies, 0)}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">On the shelf</p>
          <p className="font-serif text-2xl font-semibold text-green-700">{books.reduce((s, b) => s + b.availableCopies, 0)}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Out on loan</p>
          <p className="font-serif text-2xl font-semibold text-red-600">{checkedOut}</p>
        </div>
      </div>

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
        <EmptyState title={books.length === 0 ? 'Catalog is empty' : 'No titles match your search'} hint={books.length === 0 ? 'Use “Add a Book” to start building the collection.' : undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => {
            const empty = b.availableCopies <= 0;
            const pct = b.totalCopies > 0 ? b.availableCopies / b.totalCopies : 0;
            return (
              <div key={b.id} className={`ledger-card p-5 ${empty ? 'opacity-80' : ''}`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">{b.title}</p>
                  <Ribbon tone={empty ? 'crimson' : 'emerald'}>{empty ? '0 available' : `${b.availableCopies} in`}</Ribbon>
                </div>
                <p className="text-sm text-slate-500">{b.author}</p>
                <p className="mb-3 font-data text-xs text-slate-400">ISBN {b.isbn}</p>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{b.totalCopies} total copy{b.totalCopies === 1 ? '' : 's'}</span>
                  <span>{Math.round(pct * 100)}% on shelf</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${empty ? 'bg-red-600' : 'bg-green-600'}`} style={{ width: `${pct * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}