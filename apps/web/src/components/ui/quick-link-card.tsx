import Link from 'next/link';

export function QuickLinkCard({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group ledger-card block p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="mb-1 font-serif text-base font-semibold text-slate-900 group-hover:text-red-600">{label}</p>
      <p className="text-sm text-slate-500">{desc}</p>
    </Link>
  );
}
