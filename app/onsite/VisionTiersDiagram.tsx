export function VisionTiersDiagram() {
  const tiers = [
    {
      n: "0",
      title: "Pixel diff",
      sub: "Did anything change?",
      latency: "3–8 ms",
      coverage: "~80%",
      cost: "free",
      colorBar: "bg-emerald-500",
      colorBg: "fill-emerald-50 stroke-emerald-300 dark:fill-emerald-950/40 dark:stroke-emerald-700",
    },
    {
      n: "1",
      title: "Win32 UI Automation",
      sub: "Ask Windows directly",
      latency: "5–20 ms",
      coverage: "~10%",
      cost: "free",
      colorBar: "bg-sky-500",
      colorBg: "fill-sky-50 stroke-sky-300 dark:fill-sky-950/40 dark:stroke-sky-700",
    },
    {
      n: "2",
      title: "OpenCV template match",
      sub: "Match known buttons",
      latency: "20–50 ms",
      coverage: "~9%",
      cost: "free",
      colorBar: "bg-indigo-500",
      colorBg: "fill-indigo-50 stroke-indigo-300 dark:fill-indigo-950/40 dark:stroke-indigo-700",
    },
    {
      n: "3",
      title: "Small local VLM",
      sub: "Florence-2 / OmniParser",
      latency: "200–800 ms",
      coverage: "<1%",
      cost: "free · on-prem",
      colorBar: "bg-violet-500",
      colorBg: "fill-violet-50 stroke-violet-300 dark:fill-violet-950/40 dark:stroke-violet-700",
    },
    {
      n: "4",
      title: "Larger local VLM",
      sub: "Qwen2.5-VL-7B (dGPU)",
      latency: "1–2 s",
      coverage: "<1%",
      cost: "free · on-prem",
      colorBar: "bg-fuchsia-500",
      colorBg: "fill-fuchsia-50 stroke-fuchsia-300 dark:fill-fuchsia-950/40 dark:stroke-fuchsia-700",
    },
    {
      n: "5",
      title: "Cloud fallback",
      sub: "Anthropic Haiku",
      latency: "400–900 ms",
      coverage: "<0.5%",
      cost: "≈ $0.003/call",
      colorBar: "bg-amber-500",
      colorBg: "fill-amber-50 stroke-amber-300 dark:fill-amber-950/40 dark:stroke-amber-700",
      cloud: true,
    },
  ];

  const rowH = 70;
  const top = 60;
  const left = 30;
  const width = 820;
  const height = top + rowH * tiers.length + 80;

  return (
    <figure className="my-10 not-prose">
      <svg
        viewBox={`0 0 880 ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Tiered vision pipeline: pixel diff, Win32 UI Automation, OpenCV template matching, small local VLM, larger local VLM, cloud fallback — each tier handles a smaller fraction of ticks at higher latency."
        className="w-full h-auto"
      >
        <defs>
          <filter id="vt-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
          </filter>
        </defs>

        {/* Title */}
        <text
          x="440"
          y="32"
          textAnchor="middle"
          className="fill-slate-900 dark:fill-slate-100"
          fontSize="16"
          fontWeight="700"
          letterSpacing="0.5"
        >
          MOST TICKS NEVER LEAVE THE LAB PC
        </text>

        {/* Column headers */}
        <text x={left + 60} y={top - 14} className="fill-slate-500 dark:fill-slate-400" fontSize="11" fontWeight="600">TIER</text>
        <text x={left + 120} y={top - 14} className="fill-slate-500 dark:fill-slate-400" fontSize="11" fontWeight="600">METHOD</text>
        <text x={left + 470} y={top - 14} className="fill-slate-500 dark:fill-slate-400" fontSize="11" fontWeight="600">LATENCY</text>
        <text x={left + 590} y={top - 14} className="fill-slate-500 dark:fill-slate-400" fontSize="11" fontWeight="600">COVERS</text>
        <text x={left + 680} y={top - 14} className="fill-slate-500 dark:fill-slate-400" fontSize="11" fontWeight="600">COST</text>

        {tiers.map((t, i) => {
          const y = top + i * rowH;
          return (
            <g key={t.n} filter="url(#vt-shadow)">
              <rect
                x={left}
                y={y}
                width={width}
                height={rowH - 12}
                rx="10"
                className={t.colorBg}
                strokeWidth="1.5"
              />
              {/* Tier number badge */}
              <circle
                cx={left + 35}
                cy={y + (rowH - 12) / 2}
                r="20"
                className="fill-slate-900 dark:fill-slate-100"
              />
              <text
                x={left + 35}
                y={y + (rowH - 12) / 2 + 6}
                textAnchor="middle"
                className="fill-white dark:fill-slate-900"
                fontSize="17"
                fontWeight="700"
              >
                {t.n}
              </text>

              {/* Title + sub */}
              <text
                x={left + 76}
                y={y + 22}
                className="fill-slate-900 dark:fill-slate-100"
                fontSize="15"
                fontWeight="700"
              >
                {t.title}
              </text>
              <text
                x={left + 76}
                y={y + 40}
                className="fill-slate-600 dark:fill-slate-300"
                fontSize="12"
              >
                {t.sub}
              </text>

              {/* Latency */}
              <text
                x={left + 470}
                y={y + 32}
                className="fill-slate-900 dark:fill-slate-100"
                fontSize="13"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontWeight="600"
              >
                {t.latency}
              </text>

              {/* Coverage */}
              <text
                x={left + 590}
                y={y + 32}
                className="fill-slate-900 dark:fill-slate-100"
                fontSize="13"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontWeight="600"
              >
                {t.coverage}
              </text>

              {/* Cost */}
              <text
                x={left + 680}
                y={y + 32}
                className="fill-slate-600 dark:fill-slate-300"
                fontSize="12"
              >
                {t.cost}
              </text>

              {/* Cloud marker on tier 5 */}
              {t.cloud && (
                <text
                  x={left + width - 28}
                  y={y + 32}
                  fontSize="22"
                  textAnchor="middle"
                >
                  ☁️
                </text>
              )}
              {!t.cloud && (
                <text
                  x={left + width - 28}
                  y={y + 33}
                  fontSize="20"
                  textAnchor="middle"
                >
                  🖥️
                </text>
              )}
            </g>
          );
        })}

        {/* Cascade arrow on the left */}
        <g className="text-slate-300 dark:text-slate-600">
          <line
            x1={left - 6}
            y1={top + 5}
            x2={left - 6}
            y2={top + rowH * tiers.length - 18}
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="2 3"
          />
          <text
            x={left - 12}
            y={top + (rowH * tiers.length) / 2}
            transform={`rotate(-90 ${left - 12} ${top + (rowH * tiers.length) / 2})`}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize="10"
            fontWeight="600"
            letterSpacing="1"
          >
            FALL THROUGH ↓
          </text>
        </g>

        {/* Bottom callout */}
        <g transform={`translate(${left}, ${top + rowH * tiers.length + 8})`}>
          <rect
            width={width}
            height="50"
            rx="10"
            className="fill-slate-900 dark:fill-slate-100"
          />
          <text
            x={width / 2}
            y="22"
            textAnchor="middle"
            className="fill-white dark:fill-slate-900"
            fontSize="13"
            fontWeight="700"
          >
            End-to-end median tick: ~10 ms · p95: ~50 ms · p99: ~600 ms
          </text>
          <text
            x={width / 2}
            y="40"
            textAnchor="middle"
            className="fill-slate-400 dark:fill-slate-500"
            fontSize="11"
          >
            ~99% of ticks handled by tiers 0–2 · cloud (tier 5) optional, can be disabled for fully on-prem
          </text>
        </g>
      </svg>
      <figcaption className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        Each tier only fires when the one above it can&apos;t decide. Tier 4
        runs only if the lab PC has a discrete GPU; tier 5 is the optional
        cloud safety net.
      </figcaption>
    </figure>
  );
}
