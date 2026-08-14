"use client";

import { useState } from "react";
import { useApp } from "@/components/Providers";
import { SERVER_LABELS } from "@/data/game";

/**
 * Drop a `public/banner.webp` in and it becomes the hero backdrop; until then
 * the gradient stands on its own, so the page never ships with a broken image.
 */
export function Hero({
  stats,
}: {
  stats: { deaths: number; inWindow: number; users: number } | null;
}) {
  const { prefs, t } = useApp();
  const [hasBanner, setHasBanner] = useState(true);

  return (
    <div id="top" className="relative z-10 overflow-hidden rounded-2xl border border-edge">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-spirit/12 via-abyss to-arcane/12" />
      {hasBanner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/banner.webp"
          alt=""
          aria-hidden
          onError={() => setHasBanner(false)}
          className="absolute inset-0 -z-10 size-full object-cover opacity-35"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-void via-void/70 to-transparent" />

      <div className="px-6 py-12 sm:px-10 sm:py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-spirit/80">
          {t("app.subtitle")} · {prefs.server} — {SERVER_LABELS[prefs.server]}
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
          Nojos <span className="text-spirit">Boss Time</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">{t("app.tagline")}</p>

        <div className="mt-8 flex flex-wrap gap-2.5">
          <a
            href="#timers"
            className="rounded-xl bg-spirit px-5 py-2.5 text-sm font-bold text-void transition-colors hover:bg-spirit-deep"
          >
            {t("nav.timers")}
          </a>
          <a
            href="#rota"
            className="rounded-xl border border-edge-strong bg-surface/80 px-5 py-2.5 text-sm font-bold text-ink backdrop-blur transition-colors hover:border-spirit/50"
          >
            {t("nav.route")}
          </a>
        </div>

        {stats && (
          <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-3">
            <Stat label={t("stats.deaths")} value={stats.deaths} />
            <Stat
              label={t("stats.inwindow")}
              value={stats.inWindow}
              hint={t("stats.inwindow.hint")}
              accent
            />
            <Stat label={t("stats.contributors")} value={stats.users} />
          </dl>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div title={hint}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">{label}</dt>
      <dd
        className={`tabular mt-0.5 text-xl font-bold ${accent && value > 0 ? "text-window" : "text-ink"}`}
      >
        {value.toLocaleString()}
      </dd>
    </div>
  );
}
