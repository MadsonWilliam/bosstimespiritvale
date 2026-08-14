"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/Providers";
import type { Rank } from "@/lib/ranks";
import { Section } from "@/components/ui";

type Entry = {
  nick: string;
  points: number;
  reports: number;
  level: number;
  rank: Rank;
};

export function RankingSection({ refreshKey }: { refreshKey: number }) {
  const { prefs, identity, t } = useApp();
  const [rows, setRows] = useState<Entry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leaderboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => !cancelled && setRows(d.leaderboard ?? []))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <Section id="ranking" eyebrow="04" title={t("rank.title")} subtitle={t("rank.subtitle")}>
      {rows && rows.length === 0 ? (
        <p className="panel-flat p-8 text-center text-sm text-faint">{t("rank.empty")}</p>
      ) : (
        <div className="panel overflow-hidden">
          <ul className="divide-y divide-edge/70">
            {(rows ?? []).map((e, i) => {
              const isMe = identity?.nick.toLowerCase() === e.nick.toLowerCase();
              return (
                <li
                  key={e.nick}
                  className={`flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 ${
                    isMe ? "bg-spirit/6" : ""
                  }`}
                >
                  <span
                    className="tabular grid size-8 shrink-0 place-items-center rounded-lg text-xs font-black"
                    style={
                      i < 3
                        ? {
                            color: ["#fbbf24", "#d4d4d8", "#d97706"][i],
                            background: `${["#fbbf24", "#d4d4d8", "#d97706"][i]}18`,
                          }
                        : { color: "var(--color-faint)", background: "var(--color-abyss)" }
                    }
                  >
                    {i + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-ink">{e.nick}</span>
                      {isMe && (
                        <span className="shrink-0 rounded bg-spirit/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-spirit">
                          {t("rank.you")}
                        </span>
                      )}
                    </span>
                    <span
                      className="mt-0.5 block truncate text-xs font-semibold"
                      style={{ color: e.rank.color }}
                    >
                      {e.rank[prefs.lang]}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="tabular block text-sm font-bold text-ink">
                      {e.points.toLocaleString(prefs.lang === "pt" ? "pt-BR" : "en-US")}
                    </span>
                    <span className="block text-[11px] text-faint">
                      {t("identity.level")} {e.level} · {e.reports} {t("rank.reports")}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Section>
  );
}
