const TONES = {
  navy: 'bg-slate-900 text-white',
  crimson: 'bg-red-600 text-white',
  gold: 'bg-yellow-500 text-white',
  emerald: 'bg-green-600 text-white',
  sapphire: 'bg-blue-600 text-white',
  muted: 'bg-slate-200 text-slate-700',
} as const;

export function Ribbon({ children, tone = 'muted' }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${TONES[tone]} rounded-md px-2.5 py-0.5 text-xs font-medium`}
    >
      {children}
    </span>
  );
}
