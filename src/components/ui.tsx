"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BossState } from "@/lib/timers";
import { formatDuration } from "@/lib/timers";
import type { T } from "@/lib/i18n";

/** A shared ticking clock, so a hundred countdowns cost one timer each second. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export const STATE_STYLE: Record<
  BossState,
  { color: string; bg: string; border: string }
> = {
  alive: { color: "#34d399", bg: "rgb(52 211 153 / 0.12)", border: "rgb(52 211 153 / 0.35)" },
  window: { color: "#fbbf24", bg: "rgb(251 191 36 / 0.12)", border: "rgb(251 191 36 / 0.38)" },
  waiting: { color: "#60a5fa", bg: "rgb(96 165 250 / 0.10)", border: "rgb(96 165 250 / 0.28)" },
  overdue: { color: "#f87171", bg: "rgb(248 113 113 / 0.12)", border: "rgb(248 113 113 / 0.32)" },
  stale: { color: "#8b8b9c", bg: "rgb(139 139 156 / 0.10)", border: "rgb(139 139 156 / 0.25)" },
  unknown: { color: "#6b6b80", bg: "rgb(107 107 128 / 0.07)", border: "rgb(107 107 128 / 0.20)" },
};

export function StateBadge({
  state,
  t,
  size = "sm",
}: {
  state: BossState;
  t: T;
  size?: "sm" | "xs";
}) {
  const s = STATE_STYLE[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wider ${
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      } ${state === "window" ? "pulse-window" : ""}`}
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
      title={t(`state.${state}.desc`)}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
      />
      {t(`state.${state}`)}
    </span>
  );
}

/** Live countdown to `target`; renders "—" when there is nothing to count to. */
export function Countdown({
  target,
  now,
  lang,
  className = "",
}: {
  target: number | null;
  now: number;
  lang: "pt" | "en";
  className?: string;
}) {
  if (target === null) return <span className={className}>—</span>;
  const delta = target - now;
  return (
    <span className={`tabular ${className}`}>
      {delta >= 0 ? formatDuration(delta, lang) : `+${formatDuration(-delta, lang)}`}
    </span>
  );
}

/** Horizontal odds bar. Colour tracks how good the odds actually are. */
export function ChanceBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  const color = pct >= 55 ? "#34d399" : pct >= 25 ? "#fbbf24" : "#60a5fa";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/6">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(2, pct)}%`, background: color }}
        />
      </div>
      <span className="tabular w-9 text-right text-[11px]" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="relative z-10 scroll-mt-24">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-spirit/70">
            {eyebrow}
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Transient confirmation toast. Screen-reader friendly, auto-dismissing. */
export function Toast({
  message,
  tone = "ok",
  onDone,
}: {
  message: string;
  tone?: "ok" | "error";
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const id = setTimeout(() => onDoneRef.current(), 3200);
    return () => clearTimeout(id);
  }, [message]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-rise pointer-events-none fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-2xl backdrop-blur"
      style={
        tone === "ok"
          ? { background: "rgb(6 6 10 / 0.92)", borderColor: "rgb(52 211 153 / 0.4)", color: "#6ee7b7" }
          : { background: "rgb(6 6 10 / 0.92)", borderColor: "rgb(248 113 113 / 0.4)", color: "#fca5a5" }
      }
    >
      {message}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-faint">
      <span className="size-4 animate-spin rounded-full border-2 border-edge-strong border-t-spirit" />
      {label}
    </div>
  );
}
