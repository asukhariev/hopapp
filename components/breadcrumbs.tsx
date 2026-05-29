import Link from "next/link";

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-black/55 dark:text-white/55">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-black/25 dark:text-white/25">/</span>}
          {it.href ? (
            <Link href={it.href} className="hover:text-brand-blue hover:underline">
              {it.label}
            </Link>
          ) : (
            <span className="font-medium text-black/80 dark:text-white/80">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
