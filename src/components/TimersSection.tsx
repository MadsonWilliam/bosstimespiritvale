"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/Providers";
import { ELEMENTS, MAP_BY_SLUG, type BossMap, type Channel } from "@/data/game";
import { compareTimers, type BossState, type ChannelTimer } from "@/lib/timers";
import { formatClock } from "@/lib/time-input";
import { Countdown, Section, StateBadge, TimerProgress, TombBadge } from "@/components/ui";

/** States worth putting on the board by default — the rest is noise. */
const RELEVANT: BossState[] = ["alive", "window", "overdue", "waiting"];

type Row = { map: BossMap; timer: ChannelTimer };

export function TimersSection({
  timers,
  pinnedChannels,
  now,
  onOpen,
}: {
  timers: Record<string, ChannelTimer[]>;
  /** Set of `${slug}:${channel}` that have a tombstone pin. */
  pinnedChannels: Set<string>;
  now: number;
  onOpen: (map: BossMap, channel?: Channel) => void;
}) {
  const { t } = useApp();
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const [slug, list] of Object.entries(timers)) {
      const map = MAP_BY_SLUG.get(slug);
      if (!map) continue;
      for (const timer of list) {
        if (!showAll && !RELEVANT.includes(timer.state)) continue;
        out.push({ map, timer });
      }
    }
    return out.sort((a, b) => compareTimers(a.timer, b.timer));
  }, [timers, showAll]);

  return (
    <Section
      id="timers"
      eyebrow="02"
      title={t("timers.title")}
      subtitle={t("timers.subtitle")}
      actions={
        <button
          onClick={() => setShowAll((v) => !v)}
          className="rounded-lg border border-edge bg-surface px-3 py-2 text-xs font-semibold text-muted transition-colors hover:text-ink"
        >
          {showAll ? t("timers.showactive") : t("timers.showall")}
        </button>
      }
    >
      {rows.length === 0 ? (
        <p className="panel-flat p-8 text-center text-sm text-faint">{t("timers.empty")}</p>
      ) : (
        <div className="panel overflow-hidden">
          <ul className="divide-y divide-edge/70">
            {rows.map(({ map, timer }) => (
              <TimerRow
                key={`${map.slug}:${timer.channel}`}
                map={map}
                timer={timer}
                pinned={pinnedChannels.has(`${map.slug}:${timer.channel}`)}
                now={now}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function TimerRow({
  map,
  timer,
  pinned,
  now,
  onOpen,
}: {
  map: BossMap;
  timer: ChannelTimer;
  pinned: boolean;
  now: number;
  onOpen: (m: BossMap, channel?: Channel) => void;
}) {
  const { prefs, t } = useApp();
  const el = map.boss ? ELEMENTS[map.boss.element] : null;

  const target =
    timer.state === "waiting" ? timer.opensAt : timer.state === "window" ? timer.closesAt : null;

  return (
    <li>
      <button
        onClick={() => onOpen(map, timer.channel)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] sm:gap-4 sm:px-5"
      >
        <span className="tabular grid size-9 shrink-0 place-items-center rounded-lg border border-edge bg-abyss text-xs font-bold text-muted">
          {timer.channel}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-ink">{map.name}</span>
            {el && (
              <span
                className="hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold sm:inline"
                style={{ color: el.color, background: `${el.color}18` }}
              >
                {el[prefs.lang]}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted">
            <span className="truncate">{map.boss?.name}</span>
            {timer.lastDeath && (
              <span className="tabular hidden shrink-0 text-faint sm:inline">
                † {formatClock(timer.lastDeath.diedAt, prefs.tz, prefs.hour12)}
              </span>
            )}
            <TombBadge pinned={pinned} t={t} />
          </span>
          <span className="mt-2 block max-w-56 sm:hidden">
            <TimerProgress value={timer.progress} state={timer.state} t={t} />
          </span>
        </span>

        <span className="hidden w-40 shrink-0 sm:block">
          <TimerProgress value={timer.progress} state={timer.state} t={t} />
          <span className="mt-1 block text-right text-[10px] uppercase tracking-wider text-faint">
            {t("timer.progress")}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          <StateBadge state={timer.state} t={t} size="xs" />
          {target !== null && (
            <span className="text-[11px] text-muted">
              {t(timer.state === "waiting" ? "timer.opens" : "timer.closes")}{" "}
              <Countdown target={target} now={now} className="text-ink" />
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
