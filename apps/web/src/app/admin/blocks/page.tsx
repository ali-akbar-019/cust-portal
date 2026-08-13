'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { AdminSectionHeading, AdminStat, AdminSurface, AdminPill } from '../_components/admin-ui';

interface Room { id: string; label: string; capacity: number; type: string; }
interface Floor { id: string; floorNumber: number; rooms: Room[]; }
interface Block { id: string; name: string; floors: Floor[]; }

export default function AdminBlocksPage() {
  const { accessToken } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    setIsLoading(true);
    apiFetch<Block[]>('/blocks', { token: accessToken })
      .then(setBlocks)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load blocks'))
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const allRooms = useMemo(() => blocks.flatMap((b) => b.floors.flatMap((f) => f.rooms)), [blocks]);
  const totalCapacity = allRooms.reduce((sum, r) => sum + r.capacity, 0);
  const totalFloors = blocks.reduce((sum, b) => sum + b.floors.length, 0);
  const typeCounts = allRooms.reduce<Record<string, number>>((acc, r) => {
    const t = r.type || 'General';
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">
      <PageHeader eyebrow="Campus Facilities" title="Blocks & Rooms" subtitle="A complete view of teaching blocks, floors, rooms, capacity, and room types." />

      {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStat label="Blocks" value={blocks.length} />
        <AdminStat label="Floors" value={totalFloors} />
        <AdminStat label="Rooms" value={allRooms.length} />
        <AdminStat label="Capacity" value={totalCapacity} detail="Combined room capacity" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2].map((n) => <div key={n} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />)}
        </div>
      ) : blocks.length === 0 ? (
        <EmptyState title="No blocks configured" hint="Add blocks, floors, and rooms to enable room-aware timetable generation." />
      ) : (
        <>
          <AdminSectionHeading title="Campus blocks" subtitle={`${blocks.length} block${blocks.length === 1 ? '' : 's'} configured`} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {blocks.map((block) => {
              const blockRooms = block.floors.flatMap((f) => f.rooms);
              const blockCapacity = blockRooms.reduce((sum, r) => sum + r.capacity, 0);
              return (
                <AdminSurface key={block.id} className="overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-slate-950">Block {block.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">{block.floors.length} floors · {blockRooms.length} rooms · {blockCapacity} seats</p>
                    </div>
                    <AdminPill>{blockRooms.length} rooms</AdminPill>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {block.floors.map((floor) => (
                      <div key={floor.id} className="px-5 py-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Floor {floor.floorNumber}</p>
                          <span className="text-xs text-slate-400">{floor.rooms.length} room{floor.rooms.length === 1 ? '' : 's'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {floor.rooms.map((room) => (
                            <div key={room.id} title={`${room.type || 'General'} · capacity ${room.capacity}`} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="font-data text-sm font-semibold text-slate-800">{room.label}</p>
                              <p className="mt-0.5 text-[11px] text-slate-400">{room.capacity} seats · {room.type || 'General'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AdminSurface>
              );
            })}
          </div>

          {allRooms.length > 0 && (
            <div className="mt-8">
              <AdminSectionHeading title="Room types" subtitle="Distribution across all configured rooms" />
              <div className="flex flex-wrap gap-2">
                {Object.entries(typeCounts).map(([type, count]) => <AdminPill key={type}><strong className="mr-1">{count}</strong> {type}</AdminPill>)}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
