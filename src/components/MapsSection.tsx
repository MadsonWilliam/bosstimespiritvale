"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useApp } from "@/components/Providers";
import {
  BOSS_MAPS,
  ELEMENTS,
  REGIONS,
  TOTAL_MAPS,
  minimapUrl,
  type BossMap,
  type Channel,
} from "@/data/game";
import type { ChannelTimer } from "@/lib/timers";
import { compareTimers } from "@/lib/timers";
import { Countdown, STATE_STYLE, Section } from "@/components/ui";

type Filter = "all" | "active" | "unknown";

export function MapsSection({
  timers,
  now,
  onOpen,
}: {
  timers: Record<string, ChannelTimer[]>;
  now: number;
  onOpen: (map: BossMap, channel?: Channel) => void;
}) {
  const { prefs, t } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const maps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOSS_MAPS.filter((m) => {
      const list = timers[m.slug] ?? [];
      const hasData = list.some((x) => x.state !== "unknown");
      if (filter === "active" && !hasData) return false;
      if (filter === "unknown" && hasData) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.boss?.name.toLowerCase().includes(q) ||
        m.boss?.drops.some((d) => d.toLowerCase().includes(q)) ||
        REGIONS[m.region][prefs.lang].toLowerCase().includes(q)
      );
    }).sort((a, b) => (a.boss?.level ?? 999) - (b.boss?.level ?? 999));
  }, [query, filter, timers, prefs.lang]);

  return (
    <Section
      id="mapas"
      eyebrow="01"
      title={t("maps.title")}
      subtitle={`${t("maps.count")} (${BOSS_MAPS.length}/${TOTAL_MAPS})`}
      actions={
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("maps.search")}
            className="w-full min-w-0 rounded-lg border border-edge bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-faint focus:border-spirit/60 sm:w-64"
          />
          <div className="flex gap-1 rounded-lg border border-edge bg-surface p-1">
            {(["all", "active", "unknown"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  filter === f ? "bg-white/10 text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {t(`maps.filter.${f}`)}
              </button>
            ))}
          </div>
        </>
      }
    >
      {maps.length === 0 ? (
        <p className="panel-flat p-8 text-center text-sm text-faint">{t("maps.nodata")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {maps.map((m) => (
            <MapCard key={m.slug} map={m} timers={timers[m.slug] ?? []} now={now} onOpen={onOpen} />
          ))}
        </div>
      )}
    </Section>
  );
}

function MapCard({
  map,
  timers,
  now,
  onOpen,
}: {
  map: BossMap;
  timers: ChannelTimer[];
  now: number;
  onOpen: (m: BossMap, channel?: Channel) => void;
}) {
  const { prefs, t } = useApp();
  const el = map.boss ? ELEMENTS[map.boss.element] : null;
  const headline = [...timers].sort(compareTimers)[0];

  return (
    <button
      onClick={() => onOpen(map)}
      className="panel-flat group relative overflow-hidden text-left transition-all hover:border-edge-strong hover:shadow-lg hover:shadow-black/40"
    >
      <div className="relative aspect-16/10 overflow-hidden bg-abyss">
        <Image
          src={minimapUrl(map.slug)}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 45vw, 22vw"
          className="object-cover opacity-70 transition-all duration-500 group-hover:scale-105 group-hover:opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />

        {el && (
          <span
            className="absolute left-3 top-3 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm"
            style={{ color: el.color, background: `${el.color}22` }}
          >
            {el[prefs.lang]}
          </span>
        )}
        {map.boss && (
          <span className="tabular absolute right-3 top-3 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-ink backdrop-blur-sm">
            {t("maps.level")} {map.boss.level}
          </span>
        )}
      </div>

      <div className="relative -mt-8 p-4">
        <h3 className="truncate text-sm font-bold text-ink">{map.name}</h3>
        <p className="mt-0.5 truncate text-xs text-muted">
          {map.boss ? map.boss.name : t("maps.boss.tba")}
        </p>

        <div className="mt-3 flex items-center gap-1.5">
          {timers.map((timer) => {
            const s = STATE_STYLE[timer.state];
            const target =
              timer.state === "waiting"
                ? timer.opensAt
                : timer.state === "window"
                  ? timer.closesAt
                  : null;
            return (
              <span
                key={timer.channel}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md border py-1 text-[10px] font-bold ${
                  timer.state === "window" ? "pulse-window" : ""
                }`}
                style={{ color: s.color, background: s.bg, borderColor: s.border }}
                title={`Ch${timer.channel} · ${t(`state.${timer.state}.desc`)}`}
              >
                <span className="opacity-60">{timer.channel}</span>
                {target !== null ? (
                  <Countdown target={target} now={now} />
                ) : timer.state === "alive" ? (
                  "●"
                ) : (
                  "—"
                )}
              </span>
            );
          })}
        </div>
      </div>
    </button>
  );
}
