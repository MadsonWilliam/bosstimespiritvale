"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useApp } from "@/components/Providers";
import { ELEMENTS, minimapUrl } from "@/data/game";
import { planRoute } from "@/lib/route";
import type { ChannelTimer } from "@/lib/timers";
import { formatClock } from "@/lib/time-input";
import { ChanceBar, Countdown, Section, StateBadge, STATE_STYLE, TombBadge } from "@/components/ui";
import type { BossMap } from "@/data/game";

export function RouteSection({
  timers,
  pinnedChannels,
  now,
  onOpen,
}: {
  timers: Record<string, ChannelTimer[]>;
  pinnedChannels: Set<string>;
  now: number;
  onOpen: (map: BossMap) => void;
}) {
  const { prefs, t } = useApp();
  const [maxStops, setMaxStops] = useState(6);

  // Replanned once a minute, not every tick: the ordering is stable at that
  // resolution and recomputing per second makes the list twitch.
  const minuteBucket = Math.floor(now / 60_000);
  const stops = useMemo(
    () => planRoute({ timers, maxStops, now: minuteBucket * 60_000 }),
    [timers, maxStops, minuteBucket],
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
              const style = STATE_STYLE[stop.stateAtArrival];
              const anyPinned = stop.channels.some((c) =>
                pinnedChannels.has(`${stop.map.slug}:${c.channel}`),
              );

              return (
                <li key={stop.map.slug} className="relative">
                  <button
                    onClick={() => onOpen(stop.map)}
                    className="panel-flat flex w-full items-start gap-3 p-3 text-left transition-colors hover:border-edge-strong sm:gap-4 sm:p-4"
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

                    <span className="relative mt-0.5 hidden size-14 shrink-0 overflow-hidden rounded-lg border border-edge sm:block">
                      <Image
                        src={minimapUrl(stop.map.slug)}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover opacity-80"
                      />
                    </span>

                    <span className="min-w-0 flex-1">
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

                      {/* What it will be doing when you get there — the whole
                          point of the section, so it gets its own line. */}
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <StateBadge state={stop.stateAtArrival} t={t} size="xs" />
                        <span className="text-[11px] font-medium" style={{ color: style.color }}>
                          {t(`route.at.${stop.stateAtArrival}`)}
                        </span>
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
                        {stop.opensAt !== null && stop.closesAt !== null && (
                          <span className="tabular">
                            {t("route.window")} {formatClock(stop.opensAt, prefs.tz, prefs.hour12)}
                            {" → "}
                            {formatClock(stop.closesAt, prefs.tz, prefs.hour12)}
                          </span>
                        )}
                        <TombBadge pinned={anyPinned} t={t} />
                      </span>

                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        {stop.channels
                          .filter((c) => c.chance > 0.02)
                          .map((c) => {
                            const cs = STATE_STYLE[c.state];
                            return (
                              <span
                                key={c.channel}
                                className="tabular rounded border px-1.5 py-0.5 text-[10px] font-semibold"
                                style={{
                                  color: cs.color,
                                  background: cs.bg,
                                  borderColor: cs.border,
                                }}
                                title={t(`state.${c.state}.desc`)}
                              >
                                {t("route.check")}
                                {c.channel} · {Math.round(c.chance * 100)}%
                              </span>
                            );
                          })}
                      </span>
                    </span>

                    <span className="w-20 shrink-0 sm:w-32">
                      <ChanceBar value={stop.chance} />
                      <span className="mt-1 block text-right text-[10px] uppercase leading-tight tracking-wider text-faint">
                        {t("route.chance")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </Section>
  );
}
