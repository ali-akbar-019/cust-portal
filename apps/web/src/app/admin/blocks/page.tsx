'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';

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

  if (isLoading) return <main className="p-6 lg:p-10"><PageHeader eyebrow="Campus Facilities" title="Blocks & Rooms" subtitle="Every teaching block, floor, and room on campus" /><p className="text-sm text-slate-500">Loading blocks...</p></main>;
  if (error) return <main className="p-6 lg:p-10"><PageHeader eyebrow="Campus Facilities" title="Blocks & Rooms" /><p className="text-sm text-red-600">{error}</p></main>;

  const allRooms = blocks.flatMap((b) => b.floors.flatMap((f) => f.rooms));
  const totalCapacity = allRooms.reduce((sum, r) => sum + r.capacity, 0);
  const totalFloors = blocks.reduce((sum, b) => sum + b.floors.length, 0);
  const typeCounts = allRooms.reduce<Record<string, number>>((acc, r) => {
    const t = r.type || 'General';
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Campus Facilities"
        title="Blocks & Rooms"
        subtitle="Every block, floor, and teaching room on campus — these drive timetable placement and room allocation."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Blocks</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{blocks.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Floors</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{totalFloors}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Rooms</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{allRooms.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Combined capacity</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{totalCapacity}</p>
        </div>
      </div>

      {blocks.length === 0 ? (
        <EmptyState title="No blocks configured" hint="Add blocks, floors, and rooms to enable room-aware timetable generation." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {blocks.map((block) => {
            const blockRooms = block.floors.flatMap((f) => f.rooms);
            const blockCapacity = blockRooms.reduce((sum, r) => sum + r.capacity, 0);
            return (
              <div key={block.id} className="ledger-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                  <div>
                    <p className="font-serif text-base font-semibold text-slate-900">Block {block.name}</p>
                    <p className="text-xs text-slate-500">{block.floors.length} floor{block.floors.length === 1 ? '' : 's'} · {blockRooms.length} room{blockRooms.length === 1 ? '' : 's'} · capacity {blockCapacity}</p>
                  </div>
                </div>
                {block.floors.map((floor) => (
                  <div key={floor.id} className="border-b border-slate-100 px-5 py-3 last:border-b-0">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Floor {floor.floorNumber}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {floor.rooms.map((r) => (
                        <span
                          key={r.id}
                          title={`${r.type} · capacity ${r.capacity}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-data text-xs text-slate-600"
                        >
                          {r.label}
                          <span className="text-[10px] text-slate-400">({r.capacity})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {allRooms.length > 0 && (
        <div className="mt-8 max-w-xl">
          <p className="mb-3 font-serif text-base font-semibold text-slate-900">Room types</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeCounts).map(([type, count]) => (
              <span key={type} className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">{count}</span> × {type}
              </span>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}