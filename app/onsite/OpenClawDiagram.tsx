export function OpenClawDiagram() {
  return (
    <figure className="my-10 not-prose">
      <svg
        viewBox="0 0 880 540"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="OpenClaw vision loop: the lab PC screenshots MR4, sends the image to Claude, Claude reads the screen and replies with where to click, OpenClaw moves the mouse and clicks, the loop repeats."
        className="w-full h-auto"
      >
        <defs>
          <marker
            id="oc-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
          <filter id="oc-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Center label */}
        <g transform="translate(440, 270)">
          <circle
            r="78"
            className="fill-slate-900 dark:fill-slate-100"
          />
          <text
            x="0"
            y="-12"
            textAnchor="middle"
            className="fill-white dark:fill-slate-900"
            fontSize="15"
            fontWeight="700"
            letterSpacing="0.5"
          >
            OPENCLAW
          </text>
          <text
            x="0"
            y="10"
            textAnchor="middle"
            className="fill-slate-300 dark:fill-slate-600"
            fontSize="12"
          >
            on the Lab PC
          </text>
          <text
            x="0"
            y="32"
            textAnchor="middle"
            className="fill-slate-400 dark:fill-slate-500"
            fontSize="11"
          >
            ~1 loop / 2 sec
          </text>
        </g>

        {/* TOP: WATCH */}
        <g transform="translate(340, 30)" filter="url(#oc-shadow)">
          <rect
            width="200"
            height="120"
            rx="16"
            className="fill-sky-50 stroke-sky-300 dark:fill-sky-950/40 dark:stroke-sky-700"
            strokeWidth="2"
          />
          <text x="100" y="48" textAnchor="middle" fontSize="36">📸</text>
          <text
            x="100"
            y="80"
            textAnchor="middle"
            className="fill-slate-900 dark:fill-slate-100"
            fontSize="16"
            fontWeight="700"
          >
            1 · Watch
          </text>
          <text
            x="100"
            y="100"
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="12"
          >
            Screenshot the MR4 window
          </text>
        </g>

        {/* RIGHT: THINK */}
        <g transform="translate(640, 210)" filter="url(#oc-shadow)">
          <rect
            width="220"
            height="120"
            rx="16"
            className="fill-violet-50 stroke-violet-300 dark:fill-violet-950/40 dark:stroke-violet-700"
            strokeWidth="2"
          />
          <text x="110" y="48" textAnchor="middle" fontSize="36">🧠</text>
          <text
            x="110"
            y="80"
            textAnchor="middle"
            className="fill-slate-900 dark:fill-slate-100"
            fontSize="16"
            fontWeight="700"
          >
            2 · Think
          </text>
          <text
            x="110"
            y="100"
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="12"
          >
            Claude reads the screen
          </text>
        </g>

        {/* BOTTOM: ACT */}
        <g transform="translate(340, 390)" filter="url(#oc-shadow)">
          <rect
            width="200"
            height="120"
            rx="16"
            className="fill-emerald-50 stroke-emerald-300 dark:fill-emerald-950/40 dark:stroke-emerald-700"
            strokeWidth="2"
          />
          <text x="100" y="48" textAnchor="middle" fontSize="36">🖱️</text>
          <text
            x="100"
            y="80"
            textAnchor="middle"
            className="fill-slate-900 dark:fill-slate-100"
            fontSize="16"
            fontWeight="700"
          >
            3 · Act
          </text>
          <text
            x="100"
            y="100"
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="12"
          >
            Click where Claude pointed
          </text>
        </g>

        {/* LEFT: REPORT */}
        <g transform="translate(20, 210)" filter="url(#oc-shadow)">
          <rect
            width="220"
            height="120"
            rx="16"
            className="fill-amber-50 stroke-amber-300 dark:fill-amber-950/40 dark:stroke-amber-700"
            strokeWidth="2"
          />
          <text x="110" y="48" textAnchor="middle" fontSize="36">📝</text>
          <text
            x="110"
            y="80"
            textAnchor="middle"
            className="fill-slate-900 dark:fill-slate-100"
            fontSize="16"
            fontWeight="700"
          >
            4 · Report
          </text>
          <text
            x="110"
            y="100"
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="12"
          >
            Log action · cost · result
          </text>
        </g>

        {/* Curved arrows around the ring */}
        {/* Watch (top) -> Think (right): arc going right */}
        <g className="text-slate-400 dark:text-slate-500">
          <path
            d="M 540 100 Q 720 130 750 210"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#oc-arrow)"
          />
          <text
            x="700"
            y="148"
            textAnchor="middle"
            className="fill-slate-700 dark:fill-slate-200"
            fontSize="12"
            fontWeight="600"
          >
            image →
          </text>
        </g>

        {/* Think (right) -> Act (bottom): arc going down */}
        <g className="text-slate-400 dark:text-slate-500">
          <path
            d="M 750 330 Q 720 430 540 460"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#oc-arrow)"
          />
          <text
            x="700"
            y="408"
            textAnchor="middle"
            className="fill-slate-700 dark:fill-slate-200"
            fontSize="12"
            fontWeight="600"
          >
            coords ↓
          </text>
        </g>

        {/* Act (bottom) -> Report (left): arc going left */}
        <g className="text-slate-400 dark:text-slate-500">
          <path
            d="M 340 460 Q 160 430 130 330"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#oc-arrow)"
          />
          <text
            x="180"
            y="408"
            textAnchor="middle"
            className="fill-slate-700 dark:fill-slate-200"
            fontSize="12"
            fontWeight="600"
          >
            click done
          </text>
        </g>

        {/* Report (left) -> Watch (top): arc going up — DASHED, the loop */}
        <g className="text-slate-400 dark:text-slate-500">
          <path
            d="M 130 210 Q 160 130 340 100"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            strokeDasharray="6 4"
            markerEnd="url(#oc-arrow)"
          />
          <text
            x="180"
            y="148"
            textAnchor="middle"
            className="fill-slate-700 dark:fill-slate-200"
            fontSize="12"
            fontWeight="600"
          >
            loop
          </text>
        </g>
      </svg>
      <figcaption className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        The vision loop runs entirely on the lab PC; the only external call is
        Claude scoring one screenshot per tick. Dashed arrow = the loop closes
        and starts the next cycle.
      </figcaption>
    </figure>
  );
}
