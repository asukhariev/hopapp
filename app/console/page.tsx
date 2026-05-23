"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HopLab Console — mobile-first control surface for the lab kit.
 *
 * UI shell only — every button writes its intent into the command log. Wire
 * those to /api/runner/event in a follow-up so taps actually drive MR4.
 *
 * Original UX — does not copy any other product's UI elements.
 */

type Tab = "home" | "capture" | "export" | "history";

type Phase =
  | "idle"
  | "arming"
  | "armed"
  | "recording"
  | "stopping"
  | "exporting"
  | "done";

const phaseLabel: Record<Phase, string> = {
  idle: "Idle",
  arming: "Arming",
  armed: "Armed",
  recording: "Recording",
  stopping: "Stopping",
  exporting: "Exporting",
  done: "Done",
};

const phasePill: Record<Phase, string> = {
  idle: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  arming:
    "bg-amber-100 text-amber-700 ring-1 ring-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
  armed:
    "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
  recording:
    "bg-emerald-500 text-emerald-50 shadow-[0_0_24px_rgba(16,185,129,0.5)]",
  stopping:
    "bg-amber-100 text-amber-700 ring-1 ring-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
  exporting:
    "bg-violet-100 text-violet-700 ring-1 ring-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300",
  done: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
};

/* Theme is OS-driven — handled in app/layout.tsx bootstrap. No hook needed. */

type DeviceKind = "emg" | "imu" | "receiver" | "plate" | "cart" | "screen";

type Protocol = {
  id: string;
  label: string;
  /** Material Symbols icon name (Outlined variant). */
  icon: string;
  emg: number;
  imu: number;
  extras?: { kind: DeviceKind; label: string; count: number }[];
  duration: string;
};

const protocols: Protocol[] = [
  {
    id: "bilateral-gait",
    label: "Bilateral Gait",
    icon: "people",
    emg: 4,
    imu: 7,
    extras: [{ kind: "plate", label: "FDM-T plate", count: 1 }],
    duration: "30–60 s",
  },
  {
    id: "vo2-ramp",
    label: "VO₂ Ramp",
    icon: "directions_run",
    emg: 0,
    imu: 0,
    extras: [{ kind: "cart", label: "Metabolic cart", count: 1 }],
    duration: "12–18 min",
  },
  {
    id: "rmr",
    label: "Resting Metabolic",
    icon: "bed",
    emg: 0,
    imu: 0,
    extras: [{ kind: "cart", label: "Metabolic cart", count: 1 }],
    duration: "20 min",
  },
  { id: "chair-stand", label: "Chair Stand", icon: "chair", emg: 4, imu: 4, duration: "30 s" },
  { id: "balance", label: "Balance", icon: "sports_gymnastics", emg: 0, imu: 6, duration: "60 s" },
  { id: "jump", label: "Jump", icon: "keyboard_double_arrow_up", emg: 4, imu: 6, duration: "20 s" },
  { id: "mobility", label: "Mobility", icon: "fitness_center", emg: 0, imu: 4, duration: "5 min" },
  { id: "symmetry", label: "Symmetry", icon: "flip", emg: 4, imu: 4, duration: "45 s" },
  {
    id: "biofeedback",
    label: "Biofeedback",
    icon: "monitor_heart",
    emg: 2,
    imu: 0,
    extras: [{ kind: "screen", label: "Feedback screen", count: 1 }],
    duration: "open",
  },
  { id: "info", label: "Info", icon: "info", emg: 0, imu: 0, duration: "—" },
];

/** Material Symbol name for each device kind. */
const deviceIconName: Record<DeviceKind, string> = {
  emg: "bolt",              // electrical pulse pad
  imu: "explore",           // orientation / inertial measurement
  receiver: "cell_tower",   // wireless base station
  plate: "monitor_weight",  // force plate
  cart: "masks",            // breathing / metabolic cart
  screen: "monitor",        // feedback display
};

/** Hardcoded "connected" counts — mocking what the runner would report. */
const sensorPool = { emgConnected: 4, imuConnected: 7, receiverOnline: true };

/* ── Boot sequence ──────────────────────────────────────────────────────── */

type BootStep = { pending: string; done: string; delay: number };

const bootSequence: BootStep[] = [
  { pending: "Connecting to lab PC", done: "Connected · Therii PC · Vila do Conde", delay: 350 },
  { pending: "Waking OpenClaw daemon", done: "Daemon online · v2026.5.20", delay: 420 },
  { pending: "Capturing first screenshot", done: "Frame captured · 1440×900 · 18 ms", delay: 280 },
  { pending: "Running pixel-diff baseline", done: "Baseline frame set", delay: 180 },
  { pending: "Querying Win32 UIA tree", done: "87 UI elements indexed", delay: 240 },
  { pending: "Identifying MR4 state", done: "State S2 · Home tab (idle)", delay: 380 },
  { pending: "Verifying export folder", done: "C:\\hopclaw\\exports\\ writable", delay: 200 },
  { pending: "Ready", done: "Ready", delay: 120 },
];

type BootEntry = { ts: string; text: string; status: "pending" | "ok" };

export default function ConsolePage() {
  const [tab, setTab] = useState<Tab>("capture");
  const [phase, setPhase] = useState<Phase>("idle");
  const [protocol, setProtocol] = useState<Protocol>(protocols[0]);
  const [elapsed, setElapsed] = useState(0);
  const [bootLog, setBootLog] = useState<BootEntry[]>([]);
  const [liveState, setLiveState] = useState("S10 · Measure (recording)");

  useEffect(() => {
    if (phase !== "recording") return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "recording") return;
    const ticks = [
      "S10 · Measure (recording)",
      "S10 · Measure · 4 ch streaming",
      "S10 · Measure · waveform stable",
      "S10 · Measure · buffer 24%",
      "S10 · Measure · buffer 41%",
    ];
    let i = 0;
    const id = setInterval(() => {
      setLiveState(ticks[i % ticks.length]);
      i++;
    }, 1400);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "stopping") {
      const t = setTimeout(() => setPhase("exporting"), 900);
      return () => clearTimeout(t);
    }
    if (phase === "exporting") {
      const t = setTimeout(() => setPhase("done"), 2200);
      return () => clearTimeout(t);
    }
  }, [phase]);

  function ts() {
    return new Date().toLocaleTimeString([], { hour12: false });
  }

  function handleArm() {
    setPhase("arming");
    setBootLog([{ ts: ts(), text: bootSequence[0].pending, status: "pending" }]);
    let cumulative = 0;
    bootSequence.forEach((step, i) => {
      cumulative += step.delay;
      setTimeout(() => {
        setBootLog((log) => {
          const next = [...log];
          next[next.length - 1] = {
            ts: next[next.length - 1].ts,
            text: step.done,
            status: "ok",
          };
          if (i < bootSequence.length - 1) {
            next.push({
              ts: ts(),
              text: bootSequence[i + 1].pending,
              status: "pending",
            });
          }
          return next;
        });
        if (i === bootSequence.length - 1) {
          setPhase("armed");
        }
      }, cumulative);
    });
  }

  function handleStart() {
    setPhase("recording");
    setElapsed(0);
  }

  function handleStop() {
    setPhase("stopping");
  }

  function handleReset() {
    setPhase("idle");
    setElapsed(0);
    setBootLog([]);
  }

  return (
    <div className="relative min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Ambient gradient — warmer in light mode, subtler in dark */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-0 opacity-60 dark:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,158,11,0.12), transparent 60%), radial-gradient(ellipse 60% 50% at 50% 110%, rgba(16,185,129,0.10), transparent 60%)",
        }}
      />
      {/* Subtle grain — barely there in light, slightly stronger in dark */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-0 opacity-[0.025] dark:opacity-[0.04] dark:mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "3px 3px",
        }}
      />

      <Header phase={phase} />

      <main className="relative z-0 mx-auto w-full max-w-2xl px-4 pb-32 pt-4 sm:pt-6">
        {tab === "home" && (
          <HomeTab onStart={() => setTab("capture")} phase={phase} />
        )}
        {tab === "capture" && (
          <CaptureTab
            phase={phase}
            elapsed={elapsed}
            protocol={protocol}
            onProtocol={setProtocol}
            bootLog={bootLog}
            liveState={liveState}
            onArm={handleArm}
            onStart={handleStart}
            onStop={handleStop}
            onReset={handleReset}
          />
        )}
        {tab === "export" && (
          <ExportTab phase={phase} protocol={protocol} />
        )}
        {tab === "history" && <HistoryTab />}
      </main>

      <TabBar tab={tab} onTab={setTab} phase={phase} />
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */

function Header({ phase }: { phase: Phase }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/70">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-brand-teal text-base font-display tracking-wider text-brand-cream shadow-[0_0_24px_rgba(6,58,80,0.35)] dark:bg-brand-coral dark:text-white dark:shadow-[0_0_24px_rgba(255,99,20,0.35)]">
            H
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-950" />
          </div>
          <div>
            <div className="font-display text-lg leading-none tracking-wide">
              HOPLAB
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Console
            </div>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${phasePill[phase]}`}
        >
          {phaseLabel[phase]}
        </span>
      </div>
    </header>
  );
}

/* ── Tab bar ────────────────────────────────────────────────────────────── */

function TabBar({
  tab,
  onTab,
  phase,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  phase: Phase;
}) {
  const items: { id: Tab; label: string; icon: string }[] = [
    { id: "home", label: "Home", icon: "home" },
    { id: "capture", label: "Capture", icon: "radio_button_checked" },
    { id: "export", label: "Export", icon: "download" },
    { id: "history", label: "History", icon: "history" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200/70 bg-white/85 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {items.map((it) => {
          const active = tab === it.id;
          const captureLive = it.id === "capture" && phase === "recording";
          return (
            <button
              key={it.id}
              onClick={() => onTab(it.id)}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                active
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] ${
                  active ? "filled" : ""
                } ${captureLive ? "text-emerald-500 dark:text-emerald-400" : ""}`}
                aria-hidden
              >
                {it.icon}
              </span>
              <span>{it.label}</span>
              {active && (
                <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-brand-coral to-transparent" />
              )}
              {captureLive && (
                <span className="absolute inset-x-6 top-0 h-px animate-pulse bg-emerald-500 dark:bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Home tab ───────────────────────────────────────────────────────────── */

function HomeTab({ onStart, phase }: { onStart: () => void; phase: Phase }) {
  return (
    <div className="space-y-5">
      {/* Kit hero — the device IS the page */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/40">
        <div className="absolute inset-x-0 -top-32 mx-auto h-64 w-64 rounded-full bg-brand-coral/30 blur-3xl dark:bg-brand-coral/25" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Lab kit · Vila do Conde
          </div>
          <h1 className="mt-1 font-display text-3xl uppercase tracking-wide">
            HOP Studio · Therii PC
          </h1>

          <div className="my-8 flex items-center justify-center">
            <LabKitHero />
          </div>

          <div className="flex items-center justify-between gap-4 text-xs">
            <KitMeta label="MR" value="4.0.124" />
            <KitMeta label="Daemon" value="online" tone="ok" />
            <KitMeta label="Uplink" value="hop.agtc.app" />
          </div>

          <button
            onClick={onStart}
            className="mt-6 w-full rounded-2xl bg-brand-coral px-4 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-[0_8px_30px_rgba(255,99,20,0.4)] hover:brightness-110 active:scale-[0.99]"
          >
            {phase === "idle" ? "Open Capture →" : "Resume session →"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Sessions today" value="3" />
        <StatCard label="Avg duration" value="42s" />
        <StatCard label="Last upload" value="14m" />
        <StatCard label="Pending" value="0" />
      </section>
    </div>
  );
}

function LabKitHero() {
  // Stylized monoline SVG of a desktop monitor — the device is the page hero
  return (
    <div className="relative">
      <svg
        viewBox="0 0 200 160"
        className="h-40 w-52 text-slate-600 dark:text-slate-300"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Monitor */}
        <rect x="30" y="10" width="140" height="90" rx="6" />
        <rect x="40" y="20" width="120" height="70" rx="3" className="fill-brand-coral/10" />
        {/* On-screen waveform */}
        <path d="M50 60 q10 -15 20 0 t20 0 t20 0 t20 0 t20 0" className="text-brand-coral" />
        {/* Stand */}
        <path d="M100 100 v15" />
        <path d="M80 122 h40" />
        {/* Status LED */}
        <circle cx="160" cy="14" r="2" className="fill-emerald-400 stroke-emerald-400" />
        {/* Desk reflection */}
        <line x1="20" y1="130" x2="180" y2="130" strokeDasharray="2 4" className="opacity-30" />
      </svg>
      {/* Pulse halo */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 m-auto block h-32 w-32 animate-pulse rounded-full bg-brand-coral/25 blur-2xl"
      />
    </div>
  );
}

function KitMeta({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok";
}) {
  return (
    <div className="flex-1">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-semibold ${
          tone === "ok"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-slate-800 dark:text-slate-200"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/40">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

/* ── Capture tab ────────────────────────────────────────────────────────── */

function CaptureTab({
  phase,
  elapsed,
  protocol,
  onProtocol,
  bootLog,
  liveState,
  onArm,
  onStart,
  onStop,
  onReset,
}: {
  phase: Phase;
  elapsed: number;
  protocol: Protocol;
  onProtocol: (p: Protocol) => void;
  bootLog: BootEntry[];
  liveState: string;
  onArm: () => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}) {
  const seconds = Math.floor(elapsed / 1000);
  const tenths = Math.floor((elapsed % 1000) / 100);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}.${tenths}`;
  const protoLocked = phase !== "idle";

  return (
    <div className="space-y-5">
      {/* Protocol picker */}
      <section>
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Protocol
        </h2>
        <div className="grid grid-cols-5 gap-2">
          {protocols.map((p) => {
            const active = p.id === protocol.id;
            const disabled = protoLocked && !active;
            return (
              <button
                key={p.id}
                onClick={() => !protoLocked && onProtocol(p)}
                disabled={disabled}
                className={`group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border p-3 transition-all active:scale-[0.97] disabled:opacity-40 ${
                  active
                    ? "border-brand-coral bg-brand-coral/10 text-brand-ink shadow-[inset_0_0_30px_rgba(255,99,20,0.12)] dark:bg-brand-coral/15 dark:text-brand-cream"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute -top-8 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full bg-brand-coral/50 blur-xl"
                  />
                )}
                <span
                  className={`material-symbols-outlined relative text-[44px] sm:text-[64px] leading-none ${active ? "filled" : ""}`}
                  aria-hidden
                >
                  {p.icon}
                </span>
                <span className="relative text-center text-[10px] font-semibold uppercase tracking-wider leading-tight text-brand-ink dark:text-brand-cream">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Device rings — hidden during recording, hidden for info */}
      {phase !== "recording" && protocol.id !== "info" && (
        <DeviceRings protocol={protocol} />
      )}

      {/* Info — kit metadata */}
      {phase !== "recording" && protocol.id === "info" && <InfoPanel />}

      {/* Live recording screen — scope surface stays dark in both themes */}
      {phase === "recording" && (
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 backdrop-blur-xl">
          <Waveform
            active
            channels={Math.max(2, Math.min(4, protocol.emg || protocol.imu || 2))}
          />
          <div className="border-t border-slate-800 px-5 py-4">
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live
              </div>
              <div className="text-4xl font-bold tabular-nums tracking-tight text-white sm:text-5xl">
                {time}
              </div>
            </div>
            <div className="mt-2 font-mono text-[11px] text-emerald-400/80">
              {liveState}
            </div>
          </div>
        </section>
      )}

      {/* Boot log */}
      {bootLog.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/60">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800/80">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              OpenClaw boot
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {bootLog.filter((e) => e.status === "ok").length}/
              {bootSequence.length}
            </span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {bootLog.map((entry, i) => (
              <li
                key={i}
                className="flex items-start gap-3 px-4 py-2 font-mono text-[11px] leading-snug"
              >
                <span className="shrink-0 text-slate-400 dark:text-slate-600">
                  {entry.ts}
                </span>
                <span
                  className={`shrink-0 ${
                    entry.status === "ok"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {entry.status === "ok" ? "●" : "○"}
                </span>
                <span
                  className={
                    entry.status === "ok"
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-500 dark:text-slate-400"
                  }
                >
                  {entry.text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Primary control */}
      <section>
        {phase === "idle" &&
          (() => {
            if (protocol.id === "info") {
              return (
                <PrimaryButton onClick={() => {}} tone="slate" disabled>
                  Pick a protocol to arm
                </PrimaryButton>
              );
            }
            const ready = isReady(protocol);
            if (!ready) {
              const rows = deviceList(protocol);
              const missing = rows
                .filter((r) => r.connected < r.needed)
                .map((r) =>
                  r.needed - r.connected === 1
                    ? r.label
                    : `${r.needed - r.connected} × ${r.label}`,
                )
                .join(" · ");
              return (
                <div className="space-y-2">
                  <PrimaryButton onClick={() => {}} tone="slate" disabled>
                    Connect devices to arm
                  </PrimaryButton>
                  <p className="text-center font-mono text-[11px] text-rose-600 dark:text-rose-400">
                    Missing: {missing}
                  </p>
                </div>
              );
            }
            return (
              <PrimaryButton onClick={onArm} tone="amber">
                Arm — wake the lab kit
              </PrimaryButton>
            );
          })()}
        {phase === "arming" && (
          <PrimaryButton onClick={() => {}} tone="slate" disabled>
            Arming…
          </PrimaryButton>
        )}
        {phase === "armed" && (
          <PrimaryButton onClick={onStart} tone="emerald">
            Start recording
          </PrimaryButton>
        )}
        {phase === "recording" && (
          <PrimaryButton onClick={onStop} tone="rose">
            Stop & export
          </PrimaryButton>
        )}
        {(phase === "stopping" || phase === "exporting") && (
          <PrimaryButton onClick={() => {}} tone="slate" disabled>
            {phase === "stopping" ? "Stopping…" : "Exporting from MR4…"}
          </PrimaryButton>
        )}
        {phase === "done" && (
          <div className="space-y-2">
            <PrimaryButton onClick={onReset} tone="emerald">
              Open the file
            </PrimaryButton>
            <button
              onClick={onReset}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-transparent dark:text-slate-300 dark:hover:border-slate-700"
            >
              New session
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  tone,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone: "amber" | "emerald" | "rose" | "slate";
  disabled?: boolean;
}) {
  const colors: Record<typeof tone, string> = {
    amber:
      "bg-brand-coral text-white shadow-[0_8px_30px_rgba(255,99,20,0.4)] hover:brightness-110",
    emerald:
      "bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-950 shadow-[0_8px_30px_rgba(16,185,129,0.35)]",
    rose: "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_8px_30px_rgba(244,63,94,0.4)]",
    slate:
      "bg-slate-200 text-slate-500 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl px-4 py-5 text-base font-bold tracking-tight transition-transform active:scale-[0.98] disabled:active:scale-100 ${colors[tone]}`}
    >
      {children}
    </button>
  );
}

/* ── Device rings ───────────────────────────────────────────────────────── */

type DeviceRow = {
  kind: DeviceKind;
  label: string;
  needed: number;
  connected: number;
};

function deviceList(protocol: Protocol): DeviceRow[] {
  const rows: DeviceRow[] = [];
  if (protocol.emg > 0) {
    rows.push({
      kind: "emg",
      label: "EMG",
      needed: protocol.emg,
      connected: Math.min(protocol.emg, sensorPool.emgConnected),
    });
  }
  if (protocol.imu > 0) {
    rows.push({
      kind: "imu",
      label: "IMU",
      needed: protocol.imu,
      connected: Math.min(protocol.imu, sensorPool.imuConnected),
    });
  }
  if (protocol.extras) {
    for (const x of protocol.extras) {
      rows.push({
        kind: x.kind,
        label: x.label,
        needed: x.count,
        connected: 0,
      });
    }
  }
  rows.push({
    kind: "receiver",
    label: "Receiver",
    needed: 1,
    connected: sensorPool.receiverOnline ? 1 : 0,
  });
  return rows;
}

function isReady(protocol: Protocol): boolean {
  if (protocol.id === "info") return false;
  return deviceList(protocol).every((r) => r.connected >= r.needed);
}

function DeviceRings({ protocol }: { protocol: Protocol }) {
  const rows = deviceList(protocol);
  const totalNeeded = rows.reduce((s, r) => s + r.needed, 0);
  const totalConnected = rows.reduce((s, r) => s + r.connected, 0);
  const allReady = totalConnected === totalNeeded;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/40">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Devices
          </div>
          <div className="mt-0.5 text-sm font-bold tracking-tight">
            {protocol.label} · {protocol.duration}
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            allReady
              ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 ring-1 ring-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
          }`}
        >
          {totalConnected}/{totalNeeded} ready
        </span>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rows.map((r, i) => (
          <DeviceRing key={i} row={r} />
        ))}
      </div>
    </section>
  );
}

function DeviceRing({ row }: { row: DeviceRow }) {
  const ratio = row.needed === 0 ? 1 : Math.min(1, row.connected / row.needed);
  const ok = row.connected >= row.needed;
  const partial = row.connected > 0 && row.connected < row.needed;
  const color = ok ? "#34d399" : partial ? "#fbbf24" : "#94a3b8";

  const R = 36;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - ratio);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full -rotate-90 text-slate-200 dark:text-slate-800"
        >
          {/* Track uses currentColor so it adapts to theme */}
          <circle
            cx="50"
            cy="50"
            r={R}
            stroke="currentColor"
            strokeWidth="5"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r={R}
            stroke={color}
            strokeWidth="5"
            fill="none"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 600ms ease-out" }}
          />
        </svg>
        <div
          className={`absolute inset-0 grid place-items-center ${
            ok
              ? "text-emerald-600 dark:text-emerald-300"
              : partial
                ? "text-amber-600 dark:text-amber-300"
                : "text-slate-400 dark:text-slate-500"
          }`}
        >
          <span
            className={`material-symbols-outlined text-[44px] leading-none ${ok ? "filled" : ""}`}
            aria-hidden
          >
            {deviceIconName[row.kind]}
          </span>
        </div>
        {ok && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/15 blur-md"
          />
        )}
      </div>
      <div className="text-center">
        <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
          {row.label}
        </div>
        <div className="font-mono text-[10px] text-slate-500">
          {row.connected}/{row.needed}
        </div>
      </div>
    </div>
  );
}

/* ── Info panel ─────────────────────────────────────────────────────────── */

function InfoPanel() {
  const meta = [
    { label: "Lab kit", value: "Therii PC · Vila do Conde" },
    { label: "MR version", value: "MR 4.0.124" },
    { label: "Runner", value: "v0.1.0 · poll 5 s" },
    { label: "OpenClaw daemon", value: "v2026.5.20" },
    { label: "Display", value: "1440 × 900" },
    { label: "Export folder", value: "C:\\hopclaw\\exports\\" },
    { label: "Last heartbeat", value: "12 s ago" },
    { label: "Uplink", value: "hop.agtc.app" },
  ];
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/40">
      <header className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Kit info
        </div>
        <div className="mt-0.5 text-sm font-bold tracking-tight">
          What we know about the lab kit
        </div>
      </header>
      <dl className="grid grid-cols-2 gap-3">
        {meta.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800/60 dark:bg-slate-950/40"
          >
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">
              {m.label}
            </dt>
            <dd className="mt-1 font-mono text-[12px] text-slate-800 dark:text-slate-200">
              {m.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ── Waveform canvas ────────────────────────────────────────────────────── */

function Waveform({
  active,
  channels = 4,
}: {
  active: boolean;
  channels?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedAt = useRef<number | null>(null);
  const activeRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    activeRef.current = active;
    startedAt.current = active ? performance.now() : null;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const palette = ["#34d399", "#38bdf8", "#a78bfa", "#fbbf24"];

    function draw(now: number) {
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      ctx!.clearRect(0, 0, w, h);

      ctx!.strokeStyle = "rgba(148, 163, 184, 0.06)";
      ctx!.lineWidth = 1;
      const grid = 24;
      for (let x = 0; x < w; x += grid) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, h);
        ctx!.stroke();
      }
      for (let y = 0; y < h; y += grid) {
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(w, y);
        ctx!.stroke();
      }

      const isActive = activeRef.current;
      const t =
        isActive && startedAt.current !== null
          ? (now - startedAt.current) / 1000
          : 0;

      // Center the waveform block vertically — leave 18 % padding top + bottom
      const padTop = h * 0.18;
      const padBot = h * 0.18;
      const activeH = h - padTop - padBot;
      const bandH = activeH / channels;

      const speed = 1.6;
      const cyclesAcross = 2;

      for (let c = 0; c < channels; c++) {
        const cy = padTop + bandH * (c + 0.5);

        ctx!.strokeStyle = "rgba(148, 163, 184, 0.14)";
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(0, cy);
        ctx!.lineTo(w, cy);
        ctx!.stroke();

        ctx!.fillStyle = "rgba(148, 163, 184, 0.6)";
        ctx!.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx!.fillText(`ch${c + 1}`, 10, cy - bandH * 0.42 + 12);

        if (!isActive) continue;

        const color = palette[c % palette.length];
        ctx!.strokeStyle = color;
        ctx!.lineWidth = 1.8;
        ctx!.shadowColor = color;
        ctx!.shadowBlur = 6;
        ctx!.beginPath();
        const step = 2;
        const phase = c * (Math.PI / 3);
        // Slow "breathing" amplitude envelope per channel — feels alive without drama
        const envelope = 1 + Math.sin(t * 0.6 + phase * 0.5) * 0.08;
        for (let x = 0; x <= w; x += step) {
          const u = x / w;
          // Carrier (the clean wave)
          const carrier = Math.sin(
            u * cyclesAcross * Math.PI * 2 + t * speed + phase,
          );
          // Tiny higher-frequency wobble — looks like a real signal, not a translating template
          const wobble =
            Math.sin(u * 22 + t * 4.3 + phase * 1.7) * 0.06 +
            Math.sin(u * 47 + t * 7.1 + phase * 2.3) * 0.03;
          const v = (carrier + wobble) * envelope;
          const y = cy + v * bandH * 0.42;
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.stroke();
        ctx!.shadowBlur = 0;
      }

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [channels]);

  return <canvas ref={canvasRef} className="h-56 w-full sm:h-72" />;
}

/* ── Export tab ─────────────────────────────────────────────────────────── */

function ExportTab({
  phase,
  protocol,
}: {
  phase: Phase;
  protocol: Protocol;
}) {
  const active =
    phase === "stopping" || phase === "exporting" || phase === "done";
  const steps = [
    { label: "Stop MR4 recording", done: active },
    { label: "Open Database tab", done: phase === "exporting" || phase === "done" },
    { label: "Export → CSV", done: phase === "exporting" || phase === "done" },
    { label: "Save to C:\\hopclaw\\exports\\", done: phase === "done" },
    { label: "Upload to Vercel Blob", done: phase === "done" },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/40">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Current session
        </div>
        <div className="mt-1 text-lg font-bold tracking-tight">
          {protocol.label}
        </div>
        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {protocol.duration}
          {protocol.emg > 0 && ` · ${protocol.emg} EMG`}
          {protocol.imu > 0 && ` · ${protocol.imu} IMU`}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/40">
        <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Pipeline
        </h3>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3">
              <div
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                  s.done
                    ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300"
                    : "bg-slate-200 text-slate-500 ring-1 ring-slate-300 dark:bg-slate-800 dark:ring-slate-700"
                }`}
              >
                {s.done ? "✓" : i + 1}
              </div>
              <span
                className={`text-sm ${
                  s.done
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {phase === "done" && (
        <a
          href="#"
          className="block w-full rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-500 px-4 py-4 text-center text-base font-bold text-slate-950 shadow-[0_8px_30px_rgba(16,185,129,0.35)]"
        >
          Download CSV
        </a>
      )}
    </div>
  );
}

/* ── History tab ────────────────────────────────────────────────────────── */

const fakeHistory = [
  { id: "s-001", when: "Today · 11:42", protocol: "Bilateral Gait", duration: "47.3 s", size: "36.1 MB" },
  { id: "s-002", when: "Today · 10:55", protocol: "VO₂ Ramp", duration: "14:08", size: "11.4 MB" },
  { id: "s-003", when: "Yesterday · 17:12", protocol: "Resting Metabolic", duration: "20:00", size: "4.8 MB" },
];

function HistoryTab() {
  return (
    <div className="space-y-3">
      {fakeHistory.map((h) => (
        <a
          key={h.id}
          href="#"
          className="block rounded-2xl border border-slate-200 bg-white p-4 backdrop-blur-xl hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:border-slate-700"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight">{h.protocol}</div>
              <div className="mt-1 font-mono text-[11px] text-slate-500">
                {h.when} · {h.duration}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {h.size}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                Download →
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

/* ── Icon library ───────────────────────────────────────────────────────── */

type IconName =
  | "gait"
  | "ramp"
  | "rest"
  | "chair"
  | "balance"
  | "jump"
  | "mobility"
  | "symmetry"
  | "feedback"
  | "info"
  | "home"
  | "capture"
  | "download"
  | "history";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const stroke = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  switch (name) {
    /* Bilateral gait — clear walking-person silhouette, side view, mid-stride. */
    case "gait":
      return (
        <svg {...stroke}>
          {/* Head */}
          <circle cx="12" cy="3.5" r="2" fill="currentColor" stroke="none" />
          {/* Torso */}
          <path d="M12 5.8v6.5" strokeWidth="2" />
          {/* Front arm swinging forward */}
          <path d="M12 8.5l3.5 -1.5" />
          {/* Back arm swinging behind */}
          <path d="M12 8.5l-3.5 1.5" />
          {/* Front leg striding forward */}
          <path d="M12 12.3l3.5 5.5" strokeWidth="2" />
          {/* Front foot */}
          <path d="M15.5 17.8l2 0" strokeWidth="2" />
          {/* Back leg trailing */}
          <path d="M12 12.3l-3 5.5" strokeWidth="2" />
          {/* Back foot */}
          <path d="M9 17.8l-2 0" strokeWidth="2" />
          {/* Ground */}
          <path d="M3 21h18" strokeDasharray="2 3" />
        </svg>
      );

    /* VO₂ Ramp — runner on a treadmill with console + handle. */
    case "ramp":
      return (
        <svg {...stroke}>
          {/* Treadmill base (deck + side rail) */}
          <rect x="2" y="16" width="20" height="3" rx="1.5" strokeWidth="1.8" />
          {/* Display console */}
          <rect x="17" y="7" width="5" height="6" rx="0.8" />
          <path d="M18 9.5h3" />
          <path d="M18 11h2" />
          {/* Vertical support to console */}
          <path d="M19.5 13v3" />
          {/* Belt motion lines */}
          <path d="M4 17.5h2" strokeDasharray="1 1.5" />
          <path d="M7 17.5h2" strokeDasharray="1 1.5" />
          {/* Runner: head */}
          <circle cx="9" cy="6" r="1.8" fill="currentColor" stroke="none" />
          {/* Torso */}
          <path d="M9 7.8v4.5" strokeWidth="2" />
          {/* Arm swinging forward */}
          <path d="M9 9.5l2.5 -1" />
          {/* Arm swinging back */}
          <path d="M9 9.5l-2 1.5" />
          {/* Front leg */}
          <path d="M9 12.3l2 3.5" strokeWidth="2" />
          {/* Back leg lifted */}
          <path d="M9 12.3l-2.5 2" strokeWidth="2" />
        </svg>
      );

    /* Resting Metabolic — person lying on a bed with Z sleep glyph. */
    case "rest":
      return (
        <svg {...stroke}>
          {/* Bed surface */}
          <path d="M2 18h16" strokeWidth="2" />
          {/* Bed legs */}
          <path d="M3 18v3" />
          <path d="M17 18v3" />
          {/* Pillow */}
          <path d="M3 15h3.5v3h-3.5z" />
          {/* Head on pillow */}
          <circle cx="5" cy="13.5" r="1.6" fill="currentColor" stroke="none" />
          {/* Body lying flat */}
          <path d="M7 16.5h10" strokeWidth="2" />
          {/* Blanket bump (chest area) */}
          <path d="M7 14.5q2 -1.5 4 0" />
          {/* Z z z floating */}
          <path d="M16 4h4l-4 5h4" strokeWidth="1.6" />
        </svg>
      );

    /* Chair Stand — clear chair silhouette + a small standing figure beside it. */
    case "chair":
      return (
        <svg {...stroke}>
          {/* Chair back */}
          <path d="M4 16V4" strokeWidth="2.2" />
          {/* Top finial */}
          <path d="M4 4h0.5" />
          {/* Seat */}
          <path d="M4 11h7" strokeWidth="2.2" />
          {/* Front leg */}
          <path d="M11 11v9" strokeWidth="2" />
          {/* Back leg */}
          <path d="M4 16v4" strokeWidth="2" />
          {/* Person standing up beside chair */}
          {/* Head */}
          <circle cx="16.5" cy="5" r="1.4" fill="currentColor" stroke="none" />
          {/* Torso */}
          <path d="M16.5 6.4v5" strokeWidth="1.8" />
          {/* Arms out forward */}
          <path d="M16.5 8.5l2.5 -0.5" />
          <path d="M16.5 8.5l-1.5 0.5" />
          {/* Legs */}
          <path d="M16.5 11.4l-1.5 4" strokeWidth="1.8" />
          <path d="M16.5 11.4l2 4" strokeWidth="1.8" />
          {/* Ground */}
          <path d="M2 20h20" strokeDasharray="2 3" />
        </svg>
      );

    /* Balance — figure on one leg, arms extended, on a wobble board. */
    case "balance":
      return (
        <svg {...stroke}>
          {/* Head */}
          <circle cx="12" cy="3" r="1.8" fill="currentColor" stroke="none" />
          {/* Torso */}
          <path d="M12 5v6" strokeWidth="2" />
          {/* Arms extended wide */}
          <path d="M4 8h16" strokeWidth="1.8" />
          {/* Standing leg */}
          <path d="M12 11v6" strokeWidth="2" />
          {/* Raised leg bent at knee */}
          <path d="M12 12l3 -1" />
          <path d="M15 11l0.5 -2.5" />
          {/* Wobble board / curved base */}
          <path d="M6 18q6 3 12 0" strokeWidth="2" />
          {/* Foot on board */}
          <path d="M10.5 17h3" strokeWidth="2" />
          {/* Ground */}
          <path d="M3 21h18" strokeDasharray="2 3" />
        </svg>
      );

    /* Jump — figure mid-air, arms up in V, legs straight down. */
    case "jump":
      return (
        <svg {...stroke}>
          {/* Head */}
          <circle cx="12" cy="4" r="1.8" fill="currentColor" stroke="none" />
          {/* Torso */}
          <path d="M12 6v5" strokeWidth="2" />
          {/* Arms straight up V */}
          <path d="M12 7.5l-3 -3.5" strokeWidth="1.8" />
          <path d="M12 7.5l3 -3.5" strokeWidth="1.8" />
          {/* Legs */}
          <path d="M12 11l-2 4" strokeWidth="2" />
          <path d="M12 11l2 4" strokeWidth="2" />
          {/* Feet pointed */}
          <path d="M10 15l-1 0.5" />
          <path d="M14 15l1 0.5" />
          {/* Lift motion lines on sides */}
          <path d="M5 17l-1 -1.5" strokeWidth="1.4" />
          <path d="M3 14l-1 -1.5" strokeWidth="1.4" />
          <path d="M19 17l1 -1.5" strokeWidth="1.4" />
          <path d="M21 14l1 -1.5" strokeWidth="1.4" />
          {/* Ground dashed = airborne */}
          <path d="M3 20h18" strokeDasharray="3 2" />
        </svg>
      );

    /* Mobility — figure bent forward, hands reaching down to toes (sit-and-reach). */
    case "mobility":
      return (
        <svg {...stroke}>
          {/* Bent head — low */}
          <circle cx="10" cy="13" r="1.7" fill="currentColor" stroke="none" />
          {/* Bent torso going forward */}
          <path d="M11 14.5l4 3.5" strokeWidth="2" />
          {/* Legs straight, vertical */}
          <path d="M15 18v3" strokeWidth="2" />
          <path d="M16.5 18v3" strokeWidth="2" />
          {/* Toes */}
          <path d="M14 21h2" />
          <path d="M16 21h2" />
          {/* Arm reaching down */}
          <path d="M9 13.5l-2 6.5" strokeWidth="1.8" />
          {/* Toe-touch contact dot */}
          <circle cx="7" cy="20.5" r="0.8" fill="currentColor" stroke="none" />
          {/* Floor */}
          <path d="M3 21h18" strokeDasharray="2 3" />
        </svg>
      );

    /* Symmetry — front-view figure split by a vertical mirror axis. */
    case "symmetry":
      return (
        <svg {...stroke}>
          {/* Mirror axis */}
          <path d="M12 1v22" strokeDasharray="2 2" />
          {/* Head */}
          <circle cx="12" cy="4" r="2" fill="currentColor" stroke="none" />
          {/* Shoulders */}
          <path d="M5 9h14" strokeWidth="2" />
          {/* Torso sides */}
          <path d="M9 9v8" />
          <path d="M15 9v8" />
          {/* Hip line */}
          <path d="M9 17h6" />
          {/* Legs */}
          <path d="M10 17v6" strokeWidth="2" />
          <path d="M14 17v6" strokeWidth="2" />
          {/* Arms hanging */}
          <path d="M5 9l-0.5 5" />
          <path d="M19 9l0.5 5" />
        </svg>
      );

    /* Biofeedback — monitor showing pulse with a person watching it below. */
    case "feedback":
      return (
        <svg {...stroke}>
          {/* Monitor */}
          <rect x="3" y="2.5" width="18" height="10" rx="1.5" />
          {/* EKG inside */}
          <path
            d="M5 8h2l1.2 -3l1 5l1.3 -3l1 1.5h7.5"
            strokeWidth="2"
          />
          {/* Monitor stand */}
          <path d="M12 12.5v2" />
          <path d="M9 14.5h6" />
          {/* Person below watching */}
          <circle cx="12" cy="17.5" r="1.6" fill="currentColor" stroke="none" />
          {/* Torso */}
          <path d="M12 19v3" strokeWidth="2" />
          {/* Eye-line to monitor (subtle) */}
          <path d="M12 16l0 -1" strokeDasharray="1 1.5" />
        </svg>
      );

    /* Info — large i in circle. */
    case "info":
      return (
        <svg {...stroke}>
          <circle cx="12" cy="12" r="9.5" strokeWidth="1.8" />
          <circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
          <path d="M12 11v7" strokeWidth="2.5" />
        </svg>
      );

    /* Home — house */
    case "home":
      return (
        <svg {...stroke}>
          <path d="M3 11l9 -7l9 7" strokeWidth="1.8" />
          <path d="M5 10v10h14V10" strokeWidth="1.8" />
          <path d="M10 20v-5h4v5" strokeWidth="1.8" />
        </svg>
      );

    /* Capture — record button (filled center dot). */
    case "capture":
      return (
        <svg {...stroke}>
          <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
        </svg>
      );

    /* Download — bold arrow into tray. */
    case "download":
      return (
        <svg {...stroke}>
          <path d="M12 4v12" strokeWidth="2.2" />
          <path d="M7 11l5 5l5 -5" strokeWidth="2.2" />
          <path d="M4 20h16" strokeWidth="1.8" />
        </svg>
      );

    /* History — clock face with hand. */
    case "history":
      return (
        <svg {...stroke}>
          <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
          <path d="M12 7v5l3 2" strokeWidth="2.2" />
        </svg>
      );
  }
}

function DeviceIcon({
  kind,
  className,
}: {
  kind: DeviceKind;
  className?: string;
}) {
  const stroke = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  switch (kind) {
    /* EMG pod — round adhesive electrode with central contact + lead wire */
    case "emg":
      return (
        <svg {...stroke}>
          {/* Pad outer */}
          <circle cx="10" cy="13" r="6" />
          {/* Inner ring */}
          <circle cx="10" cy="13" r="3" />
          {/* Solid contact pin */}
          <circle cx="10" cy="13" r="1.3" fill="currentColor" stroke="none" />
          {/* Lead wire trailing off to a connector */}
          <path d="M14.2 9l4.3 -3" />
          <rect x="18.5" y="4" width="3" height="3" rx="0.5" />
        </svg>
      );

    /* IMU pod — small box with three orthogonal motion arrows */
    case "imu":
      return (
        <svg {...stroke}>
          {/* Box */}
          <rect x="6" y="6" width="12" height="12" rx="1.5" />
          {/* X axis (right) */}
          <path d="M12 12h6" />
          <path d="M16.5 10.5l1.5 1.5l-1.5 1.5" />
          {/* Y axis (up) */}
          <path d="M12 12v-6" />
          <path d="M10.5 7.5l1.5 -1.5l1.5 1.5" />
          {/* Z axis (forward / diagonal) */}
          <path d="M12 12l-3.5 3.5" />
          <path d="M8.5 14l-0.5 1.5l1.5 -0.5" />
        </svg>
      );

    /* Receiver — base station with antenna + three signal arcs */
    case "receiver":
      return (
        <svg {...stroke}>
          {/* Antenna */}
          <path d="M12 13V8" strokeWidth="2" />
          {/* Signal arcs radiating up */}
          <path d="M10 8a2 2 0 0 1 4 0" />
          <path d="M8 7a4 4 0 0 1 8 0" />
          <path d="M6 6a6 6 0 0 1 12 0" />
          {/* Base box */}
          <rect x="7" y="13" width="10" height="6" rx="1" />
          {/* Status LED */}
          <circle cx="14.5" cy="16" r="0.7" fill="currentColor" stroke="none" />
        </svg>
      );

    /* FDM-T plate — flat platform in perspective with a footprint on top */
    case "plate":
      return (
        <svg {...stroke}>
          {/* Top surface */}
          <path d="M3 14l9 -4l9 4l-9 4z" />
          {/* Side depth */}
          <path d="M3 14v3l9 4l9 -4v-3" />
          {/* Footprint silhouette */}
          <ellipse
            cx="12"
            cy="15"
            rx="2"
            ry="1"
            fill="currentColor"
            stroke="none"
          />
          {/* Toe dots */}
          <circle cx="11" cy="13.4" r="0.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="13.2" r="0.4" fill="currentColor" stroke="none" />
          <circle cx="13" cy="13.4" r="0.4" fill="currentColor" stroke="none" />
        </svg>
      );

    /* Metabolic cart — face / breathing mask with hose */
    case "cart":
      return (
        <svg {...stroke}>
          {/* Mask body (rounded teardrop, narrower at the bottom) */}
          <path d="M8 9c0 -2 2 -3 4 -3s4 1 4 3v5c0 1 -1 2 -2 2.5l-2 1l-2 -1c-1 -0.5 -2 -1.5 -2 -2.5z" />
          {/* Strap loops */}
          <path d="M8 10l-3 -1" />
          <path d="M16 10l3 -1" />
          {/* Exhaust hose drooping down */}
          <path d="M12 18l0 2" />
          <path d="M12 20c -2 1 -3 2 -3 3" />
          {/* Eye-level breath indicator dots */}
          <circle cx="11" cy="11" r="0.5" fill="currentColor" stroke="none" />
          <circle cx="13" cy="11" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      );

    /* Feedback screen — monitor with a clean EKG / pulse line */
    case "screen":
      return (
        <svg {...stroke}>
          {/* Monitor bezel */}
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          {/* EKG inside */}
          <path
            d="M5 11h2l1.5 -3.5l1.5 6l1.5 -4l1 2h6.5"
            strokeWidth="1.8"
          />
          {/* Stand */}
          <path d="M12 16v3" />
          <path d="M8 19h8" />
        </svg>
      );
  }
}
