"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BossState } from "@/lib/timers";
import { formatDuration, WINDOW_OPEN_FRACTION } from "@/lib/timers";
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
  className = "",
}: {
  target: number | null;
  now: number;
  className?: string;
}) {
  if (target === null) return <span className={className}>—</span>;
  const delta = target - now;
  return (
    <span className={`tabular ${className}`}>
      {delta >= 0 ? formatDuration(delta) : `+${formatDuration(-delta)}`}
    </span>
  );
}

/**
 * Clock progress from the death to the end of the spawn window, with a tick
 * marking where the guaranteed 60 minutes end and the random 30 begin. This
 * is a stopwatch, not a forecast: it only ever goes up, and it reads 100% once
 * the window has closed.
 */
export function TimerProgress({
  value,
  state,
  t,
  className = "",
}: {
  value: number | null;
  state: BossState;
  t: T;
  className?: string;
}) {
  if (value === null) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-1.5 flex-1 rounded-full bg-white/6" />
        <span className="tabular w-9 text-right text-[11px] text-faint">—</span>
      </div>
    );
  }

  const pct = Math.round(value * 100);
  const color = STATE_STYLE[state].color;
  const openPct = WINDOW_OPEN_FRACTION * 100;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/6"
        title={`${t("timer.guaranteed")} → ${t("timer.random")}`}
      >
        {/* The random window, shaded so the danger zone is visible at a glance */}
        <div
          className="absolute inset-y-0 right-0 bg-window/12"
          style={{ width: `${100 - openPct}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
          style={{ width: `${Math.max(1.5, pct)}%`, background: color }}
        />
        {/* Tick at the 60-minute mark */}
        <div
          className="absolute inset-y-0 w-px bg-white/40"
          style={{ left: `${openPct}%` }}
        />
      </div>
      <span className="tabular w-9 text-right text-[11px]" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

/** Odds bar used only where the number really is a forecast (the route). */
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

/**
 * Whether this map/channel's tombstone location is known. People planning a
 * route need this: without a pin you have to sweep the whole map to check.
 */
export function TombBadge({ pinned, t }: { pinned: boolean; t: T }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold"
      style={{ color: pinned ? "var(--color-imperial)" : "var(--color-faint)" }}
      title={t(pinned ? "tomb.marked" : "tomb.unmarked")}
    >
      <TombIcon muted={!pinned} />
      {pinned ? t("tomb.marked") : t("tomb.unmarked")}
    </span>
  );
}

export function TombIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden>
      <path
        d="M4.5 14V6.5a3.5 3.5 0 0 1 7 0V14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M3 14h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {!muted && (
        <path d="M8 5v3.5M6.5 6.75h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      )}
    </svg>
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
