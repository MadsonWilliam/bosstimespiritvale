"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useApp } from "@/components/Providers";
import { ELEMENTS, minimapUrl, type BossMap, type Channel } from "@/data/game";
import { planRoute } from "@/lib/route";
import type { ChannelTimer } from "@/lib/timers";
import { formatClock } from "@/lib/time-input";
import { ChanceBar, Countdown, Section, StateBadge, STATE_STYLE, TombBadge } from "@/components/ui";

export function RouteSection({
  timers,
  pinnedChannels,
  now,
  onOpen,
}: {
  timers: Record<string, ChannelTimer[]>;
  pinnedChannels: Set<string>;
  now: number;
  onOpen: (map: BossMap, channel?: Channel) => void;
}) {
  const { prefs, t } = useApp();
  const [maxStops, setMaxStops] = useState(6);

  // Replanned every 10 seconds. Often enough that a fresh report reshuffles
  // the plan while you are still looking at it, coarse enough that the list
  // does not twitch on every tick.
  const tick = Math.floor(now / 10_000);
  const stops = useMemo(
    () => planRoute({ timers, maxStops, now: tick * 10_000 }),
    [timers, maxStops, tick],
  );

  return (
    <Section
      id="rota"
      eyebrow="03"
      title={t("route.title")}
      subtitle={t("route.subtitle")}
      actions={
        <div className="flex gap-1 rounded-lg border border-edge bg-surface p-1">
          {[4, 6, 8].map((n) => (
            <button
              key={n}
              onClick={() => setMaxStops(n)}
              aria-pressed={maxStops === n}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                maxStops === n ? "bg-white/10 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      }
    >
      {stops.length === 0 ? (
        <p className="panel-flat p-8 text-center text-sm text-faint">{t("route.empty")}</p>
      ) : (
        <>
          <p className="mb-4 rounded-lg border border-edge bg-abyss/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-faint">
            {t("route.legend")}
          </p>

          <ol className="relative space-y-3 before:absolute before:bottom-8 before:left-[1.4rem] before:top-8 before:w-px before:bg-gradient-to-b before:from-spirit/40 before:via-edge-strong before:to-transparent">
            {stops.map((stop, i) => {
              const el = stop.map.boss ? ELEMENTS[stop.map.boss.element] : null;
              // Coloured by what it is doing now, matching the timer board.
              const style = STATE_STYLE[stop.stateNow];
              const anyPinned = stop.channels.some((c) =>
                pinnedChannels.has(`${stop.map.slug}:${c.channel}`),
              );

              return (
                <li
                  key={stop.map.slug}
                  className="panel-flat relative flex items-start gap-3 p-3 transition-colors hover:border-edge-strong sm:gap-4 sm:p-4"
                  style={{ borderLeftColor: style.border, borderLeftWidth: 3 }}
                >
                  <span
                    className="tabular relative z-10 mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-black"
                    style={{
                      borderColor: style.border,
                      background: style.bg,
                      color: style.color,
                    }}
                  >
                    {i + 1}
                  </span>

                  <button
                    onClick={() => onOpen(stop.map, stop.leadChannel as Channel)}
                    className="relative mt-0.5 hidden size-14 shrink-0 overflow-hidden rounded-lg border border-edge sm:block"
                    aria-label={stop.map.name}
                  >
                    <Image
                      src={minimapUrl(stop.map.slug)}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover opacity-80"
                    />
                  </button>

                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onOpen(stop.map, stop.leadChannel as Channel)}
                      className="block w-full text-left"
                    >
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-sm font-bold text-ink">
                          {stop.map.name}
                        </span>
                        {el && (
                          <span
                            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ color: el.color, background: `${el.color}18` }}
                          >
                            {stop.map.boss?.name}
                          </span>
                        )}
                      </span>

                      {/* The one line that decides whether this stop is worth
                          walking to: what it is doing, and the single clock
                          that matters for it. */}
                      <span
                        className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2 py-1.5"
                        style={{ borderColor: style.border, background: style.bg }}
                      >
                        <StateBadge state={stop.stateNow} t={t} size="xs" />
                        {stop.stateNow === "waiting" && stop.opensAt !== null ? (
                          <span className="text-[11px] font-bold" style={{ color: style.color }}>
                            {t("route.opensin")} <Countdown target={stop.opensAt} now={now} />
                          </span>
                        ) : stop.closesAt !== null ? (
                          <span className="text-[11px] font-bold" style={{ color: style.color }}>
                            {t("route.closesin")} <Countdown target={stop.closesAt} now={now} />
                          </span>
                        ) : null}
                        {stop.stateAtArrival !== stop.stateNow && (
                          <span className="text-[11px] text-muted">
                            → {t(`route.at.${stop.stateAtArrival}`)}
                          </span>
                        )}
                      </span>

                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-faint">
                        <span>
                          {t("route.arrive")}{" "}
                          <span className="tabular text-muted">
                            {formatClock(stop.arrivesAt, prefs.tz, prefs.hour12)}
                          </span>
                          <span className="tabular text-faint">
                            {" "}
                            (<Countdown target={stop.arrivesAt} now={now} />)
                          </span>
                        </span>
                        {stop.peakAt !== null && (
                          <span className="tabular" title={t("route.peak.hint")}>
                            {t("route.peak")}{" "}
                            <span className="text-muted">
                              {formatClock(stop.peakAt, prefs.tz, prefs.hour12)}
                            </span>
                          </span>
                        )}
                        <TombBadge pinned={anyPinned} t={t} />
                      </span>
                    </button>

                    {/* Separate buttons, outside the main one: each chip jumps
                        straight into that channel. */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {stop.channels
                        .filter((c) => c.chance > 0.02)
                        .map((c) => {
                          const cs = STATE_STYLE[c.state];
                          return (
                            <button
                              key={c.channel}
                              onClick={() => onOpen(stop.map, c.channel as Channel)}
                              className="tabular rounded border px-1.5 py-0.5 text-[10px] font-semibold transition-transform hover:scale-105"
                              style={{
                                color: cs.color,
                                background: cs.bg,
                                borderColor: cs.border,
                              }}
                              title={t(`state.${c.state}.desc`)}
                            >
                              {t("route.check")}
                              {c.channel} · {Math.round(c.chance * 100)}%
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div className="w-20 shrink-0 sm:w-32">
                    <ChanceBar value={stop.chance} />
                    <span className="mt-1 block text-right text-[10px] uppercase leading-tight tracking-wider text-faint">
                      {t("route.chance")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </Section>
  );
}
