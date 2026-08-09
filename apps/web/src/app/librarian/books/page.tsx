'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

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
      setStatus('Book added.');
      setForm({ title: '', author: '', isbn: '', totalCopies: '' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add book');
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Add a Book</h1>
      <div className="mb-8 max-w-md space-y-3 rounded-lg border border-slate-200 p-4">
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
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
        <input
          placeholder="Total copies"
          type="number"
          value={form.totalCopies}
          onChange={(e) => update('totalCopies', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {status && <p className="text-sm text-green-600">{status}</p>}
        <button onClick={handleAdd} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Add Book
        </button>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Catalog</h2>
      <div className="max-w-2xl space-y-2">
        {books.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <p className="font-medium">{b.title}</p>
              <p className="text-xs text-slate-500">
                {b.author} · ISBN {b.isbn}
              </p>
            </div>
            <span className="text-sm text-slate-500">
              {b.availableCopies}/{b.totalCopies} available
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
