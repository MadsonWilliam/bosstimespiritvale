"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useApp } from "@/components/Providers";
import { BOSS_MAPS, ELEMENTS, minimapUrl, type BossMap } from "@/data/game";
import { planRoute } from "@/lib/route";
import type { ChannelTimer } from "@/lib/timers";
import { formatClock } from "@/lib/time-input";
import { ChanceBar, Section } from "@/components/ui";

export function RouteSection({
  timers,
  now,
  onOpen,
}: {
  timers: Record<string, ChannelTimer[]>;
  now: number;
  onOpen: (map: BossMap) => void;
}) {
  const { prefs, t } = useApp();
  const [startMap, setStartMap] = useState<string>("");
  const [maxStops, setMaxStops] = useState(6);

  // Recomputed each minute rather than each second: the ordering is stable at
  // that resolution and replanning on every tick makes the list twitch.
  const minuteBucket = Math.floor(now / 60_000);
  const stops = useMemo(
    () =>
      planRoute({
        timers,
        startMap: startMap || null,
        maxStops,
        now: minuteBucket * 60_000,
      }),
    [timers, startMap, maxStops, minuteBucket],
  );

  return (
    <Section
      id="rota"
      eyebrow="03"
      title={t("route.title")}
      subtitle={t("route.subtitle")}
      actions={
        <>
          <select
            value={startMap}
            onChange={(e) => setStartMap(e.target.value)}
            aria-label={t("route.from")}
            className="w-full min-w-0 rounded-lg border border-edge bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-spirit/60 sm:w-56"
          >
            <option value="">{t("route.from")}: {t("route.from.any")}</option>
            {[...BOSS_MAPS]
              .filter((m) => m.boss)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
          </select>
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
        </>
      }
    >
      {stops.length === 0 ? (
        <p className="panel-flat p-8 text-center text-sm text-faint">{t("route.empty")}</p>
      ) : (
        <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[1.4rem] before:top-6 before:w-px before:bg-gradient-to-b before:from-spirit/40 before:via-edge-strong before:to-transparent">
          {stops.map((stop, i) => {
            const el = stop.map.boss ? ELEMENTS[stop.map.boss.element] : null;
            return (
              <li key={stop.map.slug} className="relative">
                <button
                  onClick={() => onOpen(stop.map)}
                  className="panel-flat flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-edge-strong sm:gap-4 sm:p-4"
                >
                  <span
                    className="tabular relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-black"
                    style={{
                      borderColor: i === 0 ? "var(--color-spirit)" : "var(--color-edge-strong)",
                      background: i === 0 ? "rgb(94 234 212 / 0.15)" : "var(--color-abyss)",
                      color: i === 0 ? "var(--color-spirit)" : "var(--color-muted)",
                    }}
                  >
                    {i + 1}
                  </span>

                  <span className="relative hidden size-14 shrink-0 overflow-hidden rounded-lg border border-edge sm:block">
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
                      <span className="truncate text-sm font-bold text-ink">{stop.map.name}</span>
                      {el && (
                        <span
                          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ color: el.color, background: `${el.color}18` }}
                        >
                          {stop.map.boss?.name}
                        </span>
                      )}
                    </span>

                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-faint">
                      <span>
                        {t("route.arrive")}{" "}
                        <span className="tabular text-muted">
                          {formatClock(stop.arrivesAt, prefs.tz, prefs.hour12)}
                        </span>
                      </span>
                      {i > 0 && (
                        <span>
                          {stop.hopsFromPrevious}{" "}
                          {stop.hopsFromPrevious === 1 ? t("route.hop") : t("route.hops")}
                        </span>
                      )}
                    </span>

                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      {stop.channels
                        .filter((c) => c.chance > 0.02)
                        .map((c) => (
                          <span
                            key={c.channel}
                            className="tabular rounded border border-edge bg-abyss px-1.5 py-0.5 text-[10px] font-semibold text-muted"
                          >
                            {t("route.check")}
                            {c.channel} · {Math.round(c.chance * 100)}%
                          </span>
                        ))}
                    </span>
                  </span>

                  <span className="w-20 shrink-0 sm:w-32">
                    <ChanceBar value={stop.chance} />
                    <span className="mt-1 block text-right text-[10px] uppercase tracking-wider text-faint">
                      {t("route.chance")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
