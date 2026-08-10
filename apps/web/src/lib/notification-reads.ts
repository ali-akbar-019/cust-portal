// Client-side read receipts for announcements, keyed per user so marking
// one account's notices as read never hides them for someone else sharing
// the same device. Server-side receipts (a DB join table) are a flagged
// future upgrade — see PROGRESS.md.
const STORAGE_PREFIX = 'cust-notif-read';

export function readSetKey(userId: string | undefined): string {
  const suffix = userId || 'anonymous';
  return `${STORAGE_PREFIX}:${suffix}`;
}

function getSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function isMarkedRead(key: string, id: string): boolean {
  return getSet(key).has(id);
}

export function markRead(key: string, id: string): void {
  const set = getSet(key);
  set.add(id);
  localStorage.setItem(key, JSON.stringify([...set]));
}

export function markManyRead(key: string, ids: string[]): void {
  const set = getSet(key);
  ids.forEach((id) => set.add(id));
  localStorage.setItem(key, JSON.stringify([...set]));
}