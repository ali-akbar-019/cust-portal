import Link from 'next/link';

interface StatCardProps {
  href?: string;
  label: string;
  value: string;
  hint?: string;
}

export function StatCard({
  href,
  label,
  value,
  hint,
}: StatCardProps) {
  const content = (
    <div
      className="
        group relative min-w-0 overflow-hidden
        rounded-2xl
        border border-slate-200/80
        bg-white/90
        p-4 shadow-sm
        backdrop-blur-sm
        transition-all duration-200
        hover:-translate-y-0.5
        hover:border-slate-300
        hover:shadow-md
        sm:p-5
      "
    >
      {/* Subtle left accent */}
      <div
        className="
          absolute left-0 top-4 bottom-4
          w-0.5 rounded-full
          bg-slate-900
          opacity-70
          transition-all duration-200
          group-hover:top-3
          group-hover:bottom-3
          group-hover:opacity-100
        "
      />

      <div className="min-w-0 pl-2">
        {/* Label */}
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p
            className="
              truncate
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-slate-400
            "
          >
            {label}
          </p>

          {href && (
            <span
              className="
                shrink-0
                text-sm
                text-slate-300
                transition-all duration-200
                group-hover:translate-x-0.5
                group-hover:text-slate-500
              "
              aria-hidden="true"
            >
              →
            </span>
          )}
        </div>

        {/* Value */}
        <p
          className="
            mt-2
            truncate
            font-serif
            text-2xl
            font-semibold
            leading-none
            tracking-tight
            text-slate-900
            sm:text-3xl
          "
        >
          {value}
        </p>

        {/* Hint */}
        {hint ? (
          <p
            className="
              mt-2
              truncate
              text-xs
              font-medium
              text-slate-500
            "
          >
            {hint}
          </p>
        ) : (
          <div className="mt-2 h-4" aria-hidden="true" />
        )}
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      className="
        block min-w-0
        rounded-2xl
        outline-none
        focus-visible:ring-2
        focus-visible:ring-slate-400
        focus-visible:ring-offset-2
      "
    >
      {content}
    </Link>
  );
}