export function SystemDiagram() {
  return (
    <figure className="my-10 not-prose">
      <svg
        viewBox="0 0 880 560"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="System diagram showing how a click on the phone travels through hop.agtc.app, gets picked up by the lab PC runner which drives MR4, and the exported file comes back to the cloud for download."
        className="w-full h-auto"
      >
        <defs>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
          <filter id="softshadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Three cards row */}
        {/* YOU */}
        <g transform="translate(30, 60)" filter="url(#softshadow)">
          <rect
            width="240"
            height="200"
            rx="20"
            className="fill-sky-50 stroke-sky-300 dark:fill-sky-950/40 dark:stroke-sky-700"
            strokeWidth="2"
          />
          <text
            x="120"
            y="70"
            textAnchor="middle"
            fontSize="56"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            📱
          </text>
          <text
            x="120"
            y="120"
            textAnchor="middle"
            className="fill-slate-900 dark:fill-slate-100"
            fontSize="22"
            fontWeight="700"
          >
            You
          </text>
          <text
            x="120"
            y="148"
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="13"
          >
            On your phone, open
          </text>
          <text
            x="120"
            y="166"
            textAnchor="middle"
            className="fill-slate-900 dark:fill-slate-100"
            fontSize="13"
            fontWeight="600"
          >
            hop.agtc.app
          </text>
          <text
            x="120"
            y="184"
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="13"
          >
            Press Start · Stop
          </text>
        </g>

        {/* CLOUD */}
        <g transform="translate(320, 60)" filter="url(#softshadow)">
          <rect
            width="240"
            height="200"
            rx="20"
            className="fill-violet-50 stroke-violet-300 dark:fill-violet-950/40 dark:stroke-violet-700"
            strokeWidth="2"
          />
          <text
            x="120"
            y="70"
            textAnchor="middle"
            fontSize="56"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            ☁️
          </text>
          <text
            x="120"
            y="120"
            textAnchor="middle"
            className="fill-slate-900 dark:fill-slate-100"
            fontSize="22"
            fontWeight="700"
          >
            Cloud
          </text>
          <text
            x="120"
            y="148"
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="13"
          >
            Web app on Vercel
          </text>
          <text
            x="120"
            y="166"
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="13"
          >
            Keeps the to-do list
          </text>
          <text
            x="120"
            y="184"
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="13"
          >
            Stores the result files
          </text>
        </g>

        {/* LAB PC */}
        <g transform="translate(610, 60)" filter="url(#softshadow)">
          <rect
            width="240"
            height="200"
            rx="20"
            className="fill-emerald-50 stroke-emerald-300 dark:fill-emerald-950/40 dark:stroke-emerald-700"
            strokeWidth="2"
          />
          <text
            x="120"
            y="70"
            textAnchor="middle"
            fontSize="56"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            🖥️
          </text>
          <text
            x="120"
            y="120"
            textAnchor="middle"
            className="fill-slate-900 dark:fill-slate-100"
            fontSize="22"
            fontWeight="700"
          >
            Lab PC
          </text>
          <text
            x="120"
            y="148"
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="13"
          >
            Vila do Conde · MR4
          </text>
          <text
            x="120"
            y="166"
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="13"
          >
            Tiny program (runner)
          </text>
          <text
            x="120"
            y="184"
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="13"
          >
            asks the cloud what to do
          </text>
        </g>

        {/* Arrow 1: YOU -> CLOUD (top) */}
        <g className="text-sky-500 dark:text-sky-400">
          <path
            d="M 270 130 L 318 130"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#arrowhead)"
          />
          <text
            x="294"
            y="118"
            textAnchor="middle"
            className="fill-slate-700 dark:fill-slate-200"
            fontSize="12"
            fontWeight="600"
          >
            tap
          </text>
        </g>

        {/* Arrow 2: LAB PC -> CLOUD (top, polls) */}
        <g className="text-emerald-500 dark:text-emerald-400">
          <path
            d="M 610 130 L 562 130"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            strokeDasharray="6 4"
            markerEnd="url(#arrowhead)"
          />
          <text
            x="586"
            y="118"
            textAnchor="middle"
            className="fill-slate-700 dark:fill-slate-200"
            fontSize="12"
            fontWeight="600"
          >
            asks every 5s
          </text>
        </g>

        {/* Arrow 3: CLOUD -> LAB PC (bottom, returns command) */}
        <g className="text-violet-500 dark:text-violet-400">
          <path
            d="M 562 210 L 610 210"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#arrowhead)"
          />
          <text
            x="586"
            y="232"
            textAnchor="middle"
            className="fill-slate-700 dark:fill-slate-200"
            fontSize="12"
            fontWeight="600"
          >
            “go”
          </text>
        </g>

        {/* Divider */}
        <line
          x1="40"
          y1="310"
          x2="840"
          y2="310"
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth="1"
          strokeDasharray="2 4"
        />

        {/* Bottom row: the loop */}
        <text
          x="440"
          y="345"
          textAnchor="middle"
          className="fill-slate-900 dark:fill-slate-100"
          fontSize="15"
          fontWeight="700"
          letterSpacing="0.5"
        >
          ONE RECORDING · END-TO-END
        </text>

        {/* Step pill: 1 */}
        <g transform="translate(40, 380)">
          <rect
            width="170"
            height="140"
            rx="14"
            className="fill-slate-50 stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <circle cx="28" cy="30" r="14" className="fill-sky-500" />
          <text
            x="28"
            y="35"
            textAnchor="middle"
            fill="white"
            fontSize="14"
            fontWeight="700"
          >
            1
          </text>
          <text
            x="55"
            y="36"
            className="fill-slate-900 dark:fill-slate-100"
            fontSize="13"
            fontWeight="700"
          >
            Press Start
          </text>
          <text
            x="14"
            y="68"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="12"
          >
            You tap on the phone.
          </text>
          <text
            x="14"
            y="86"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="12"
          >
            Cloud notes “start”.
          </text>
          <text
            x="14"
            y="110"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize="11"
            fontStyle="italic"
          >
            Technician hits Record
          </text>
          <text
            x="14"
            y="124"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize="11"
            fontStyle="italic"
          >
            in MR4 + tests patient.
          </text>
        </g>

        {/* arrow 1->2 */}
        <path
          d="M 218 450 L 248 450"
          className="stroke-slate-400 dark:stroke-slate-500"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />

        {/* Step pill: 2 */}
        <g transform="translate(255, 380)">
          <rect
            width="170"
            height="140"
            rx="14"
            className="fill-slate-50 stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <circle cx="28" cy="30" r="14" className="fill-violet-500" />
          <text
            x="28"
            y="35"
            textAnchor="middle"
            fill="white"
            fontSize="14"
            fontWeight="700"
          >
            2
          </text>
          <text
            x="55"
            y="36"
            className="fill-slate-900 dark:fill-slate-100"
            fontSize="13"
            fontWeight="700"
          >
            Press Stop
          </text>
          <text
            x="14"
            y="68"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="12"
          >
            You tap on the phone.
          </text>
          <text
            x="14"
            y="86"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="12"
          >
            Cloud flips to “export”.
          </text>
          <text
            x="14"
            y="110"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize="11"
            fontStyle="italic"
          >
            Lab PC sees it on its
          </text>
          <text
            x="14"
            y="124"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize="11"
            fontStyle="italic"
          >
            next poll (≤5s).
          </text>
        </g>

        {/* arrow 2->3 */}
        <path
          d="M 433 450 L 463 450"
          className="stroke-slate-400 dark:stroke-slate-500"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />

        {/* Step pill: 3 */}
        <g transform="translate(470, 380)">
          <rect
            width="170"
            height="140"
            rx="14"
            className="fill-slate-50 stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <circle cx="28" cy="30" r="14" className="fill-emerald-500" />
          <text
            x="28"
            y="35"
            textAnchor="middle"
            fill="white"
            fontSize="14"
            fontWeight="700"
          >
            3
          </text>
          <text
            x="55"
            y="36"
            className="fill-slate-900 dark:fill-slate-100"
            fontSize="13"
            fontWeight="700"
          >
            Lab PC drives MR4
          </text>
          <text
            x="14"
            y="68"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="12"
          >
            Robot clicks 10 buttons
          </text>
          <text
            x="14"
            y="86"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="12"
          >
            inside MR4 for you.
          </text>
          <text
            x="14"
            y="110"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize="11"
            fontStyle="italic"
          >
            File lands in a folder
          </text>
          <text
            x="14"
            y="124"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize="11"
            fontStyle="italic"
          >
            on the PC.
          </text>
        </g>

        {/* arrow 3->4 */}
        <path
          d="M 648 450 L 678 450"
          className="stroke-slate-400 dark:stroke-slate-500"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />

        {/* Step pill: 4 */}
        <g transform="translate(685, 380)">
          <rect
            width="170"
            height="140"
            rx="14"
            className="fill-slate-50 stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <circle cx="28" cy="30" r="14" className="fill-amber-500" />
          <text
            x="28"
            y="35"
            textAnchor="middle"
            fill="white"
            fontSize="14"
            fontWeight="700"
          >
            4
          </text>
          <text
            x="55"
            y="36"
            className="fill-slate-900 dark:fill-slate-100"
            fontSize="13"
            fontWeight="700"
          >
            File comes back
          </text>
          <text
            x="14"
            y="68"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="12"
          >
            Lab PC uploads it to
          </text>
          <text
            x="14"
            y="86"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="12"
          >
            the cloud automatically.
          </text>
          <text
            x="14"
            y="110"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize="11"
            fontStyle="italic"
          >
            You see a green pill +
          </text>
          <text
            x="14"
            y="124"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize="11"
            fontStyle="italic"
          >
            a download link.
          </text>
        </g>
      </svg>
      <figcaption className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        Solid arrows = your taps. Dashed arrow = the lab PC asking the cloud
        “anything for me?” every 5 seconds.
      </figcaption>
    </figure>
  );
}
