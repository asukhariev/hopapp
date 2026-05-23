import { readFile } from "node:fs/promises";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata = {
  title: "On-Site Action Plan — Therii PC, Day 1",
  description:
    "Step-by-step lab runbook for the first real-hardware HopClaw test.",
};

export default async function OnsitePage() {
  const file = path.join(process.cwd(), "content", "onsite-action-plan.md");
  const md = await readFile(file, "utf8");

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <article
        className="
          prose prose-slate prose-sm sm:prose-base dark:prose-invert
          prose-headings:scroll-mt-20
          prose-h1:text-3xl prose-h1:font-bold prose-h1:tracking-tight
          prose-h2:mt-10 prose-h2:border-t prose-h2:border-slate-200 dark:prose-h2:border-slate-800 prose-h2:pt-6
          prose-pre:bg-slate-950 prose-pre:text-slate-100 prose-pre:rounded-lg
          prose-code:before:content-none prose-code:after:content-none
          prose-code:rounded prose-code:bg-slate-100 dark:prose-code:bg-slate-800
          prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.9em] prose-code:font-medium
          prose-table:text-sm
          prose-th:bg-slate-100 dark:prose-th:bg-slate-800
          max-w-none
        "
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
      </article>
      <footer className="mt-12 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Source:{" "}
        <a
          className="underline hover:text-slate-700 dark:hover:text-slate-200"
          href="https://github.com/asukhariev/hopclaw/pull/1"
        >
          asukhariev/hopclaw#1
        </a>
      </footer>
    </main>
  );
}
