'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface Room {
  id: string;
  label: string;
  capacity: number;
  type: string;
}
interface Floor {
  id: string;
  floorNumber: number;
  rooms: Room[];
}
interface Block {
  id: string;
  name: string;
  floors: Floor[];
}

export default function AdminBlocksPage() {
  const { accessToken } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<Block[]>('/blocks', { token: accessToken })
      .then(setBlocks)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load blocks'))
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  if (isLoading) return <main className="p-8 text-sm text-slate-500">Loading blocks...</main>;
  if (error) return <main className="p-8 text-sm text-red-600">{error}</main>;

  return (
    <main className="p-8">
      <h1 className="mb-6 text-xl font-semibold">Blocks &amp; Rooms</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {blocks.map((block) => (
          <div key={block.id} className="rounded-lg border border-slate-200 p-4">
            <h2 className="mb-2 font-medium">Block {block.name}</h2>
            {block.floors.map((floor) => (
              <div key={floor.id} className="mb-2 text-sm">
                <span className="text-slate-500">Floor {floor.floorNumber}: </span>
                {floor.rooms.map((r) => (
                  <span
                    key={r.id}
                    className="mr-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs"
                    title={`Capacity ${r.capacity} — ${r.type}`}
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* TODO: add-block / add-floor / add-room forms (POST /blocks is already guarded ADMIN-only) */}
    </main>
  );
}
