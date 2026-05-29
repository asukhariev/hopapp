import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 dark:border-white/10 bg-brand-cream/80 dark:bg-[#0a1218]/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Hop<span className="text-brand-coral">Lab</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-brand-blue transition-colors">
            Users
          </Link>
          <Link href="/screenshots" className="hover:text-brand-blue transition-colors">
            Screenshots
          </Link>
        </nav>
      </div>
    </header>
  );
}
