import { readFile } from "node:fs/promises";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SystemDiagram } from "./SystemDiagram";
import { OpenClawDiagram } from "./OpenClawDiagram";
import { VisionTiersDiagram } from "./VisionTiersDiagram";

export const metadata = {
  title: "On-Site Action Plan — Therii PC, Day 1",
  description:
    "Step-by-step lab runbook for the first real-hardware HopClaw test.",
};

const SYSTEM_MARKER = "<!-- SYSTEM_DIAGRAM -->";
const OPENCLAW_MARKER = "<!-- OPENCLAW_DIAGRAM -->";
const TIERS_MARKER = "<!-- VISION_TIERS_DIAGRAM -->";

const proseClasses = `
  prose prose-slate prose-sm sm:prose-base dark:prose-invert
  prose-headings:scroll-mt-20
  prose-h1:font-display prose-h1:text-4xl prose-h1:uppercase prose-h1:tracking-wide prose-h1:font-normal
  prose-h2:mt-10 prose-h2:border-t prose-h2:border-slate-200 dark:prose-h2:border-slate-800 prose-h2:pt-6
  prose-pre:bg-slate-950 prose-pre:text-slate-100 prose-pre:rounded-lg
  prose-table:text-sm
  prose-th:bg-slate-100 dark:prose-th:bg-slate-800
  max-w-none
  [&_:not(pre)>code]:rounded
  [&_:not(pre)>code]:bg-slate-100
  [&_:not(pre)>code]:px-1.5
  [&_:not(pre)>code]:py-0.5
  [&_:not(pre)>code]:text-[0.875em]
  [&_:not(pre)>code]:font-medium
  [&_:not(pre)>code]:text-slate-900
  [&_:not(pre)>code]:before:content-none
  [&_:not(pre)>code]:after:content-none
  dark:[&_:not(pre)>code]:bg-slate-800
  dark:[&_:not(pre)>code]:text-slate-100
`;

type Block =
  | { kind: "md"; body: string }
  | { kind: "diagram"; which: "system" | "openclaw" | "tiers" };

function splitMarkdown(md: string): Block[] {
  const parts = md.split(
    /(<!-- SYSTEM_DIAGRAM -->|<!-- OPENCLAW_DIAGRAM -->|<!-- VISION_TIERS_DIAGRAM -->)/,
  );
  const blocks: Block[] = [];
  for (const part of parts) {
    if (part === SYSTEM_MARKER) blocks.push({ kind: "diagram", which: "system" });
    else if (part === OPENCLAW_MARKER) blocks.push({ kind: "diagram", which: "openclaw" });
    else if (part === TIERS_MARKER) blocks.push({ kind: "diagram", which: "tiers" });
    else if (part.trim().length > 0) blocks.push({ kind: "md", body: part });
  }
  return blocks;
}

export default async function OnsitePage() {
  const file = path.join(process.cwd(), "content", "onsite-action-plan.md");
  const md = await readFile(file, "utf8");
  const blocks = splitMarkdown(md);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      {blocks.map((block, i) => {
        if (block.kind === "diagram") {
          if (block.which === "system") return <SystemDiagram key={i} />;
          if (block.which === "openclaw") return <OpenClawDiagram key={i} />;
          if (block.which === "tiers") return <VisionTiersDiagram key={i} />;
          return null;
        }
        return (
          <article key={i} className={proseClasses}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {block.body}
            </ReactMarkdown>
          </article>
        );
      })}
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
