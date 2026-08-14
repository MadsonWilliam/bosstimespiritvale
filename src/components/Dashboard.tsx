"use client";

import { useCallback, useState } from "react";
import { useApp } from "@/components/Providers";
import { useServerState, useTimers } from "@/components/useBossState";
import { Hero } from "@/components/Hero";
import { MapsSection } from "@/components/MapsSection";
import { TimersSection } from "@/components/TimersSection";
import { RouteSection } from "@/components/RouteSection";
import { RankingSection } from "@/components/RankingSection";
import { MapDialog } from "@/components/MapDialog";
import { Spinner, Toast, useNow } from "@/components/ui";
import type { BossMap } from "@/data/game";

export function Dashboard() {
  const { prefs, hydrating, t } = useApp();
  const now = useNow(1000);
  const { payload, loading, error, refresh } = useServerState(prefs.server);
  const timers = useTimers(payload, now);

  const [openMap, setOpenMap] = useState<BossMap | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(null);
  const [rankKey, setRankKey] = useState(0);

  const notify = useCallback((msg: string, tone: "ok" | "error" = "ok") => {
    setToast({ msg, tone });
  }, []);

  const onReported = useCallback(() => {
    refresh();
    setRankKey((k) => k + 1);
  }, [refresh]);

  if (hydrating || (loading && !payload)) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <Spinner label={t("common.loading")} />
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-7xl space-y-20 px-4 pb-8 pt-4 sm:px-6">
        <Hero stats={payload?.stats ?? null} />

        {error && (
          <div className="panel-flat flex items-center justify-between gap-3 border-overdue/40 p-4 text-sm">
            <span className="text-overdue">{t("common.error")}</span>
            <button
              onClick={refresh}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink"
            >
              {t("common.retry")}
            </button>
          </div>
        )}

        <MapsSection timers={timers} now={now} onOpen={setOpenMap} />
        <TimersSection timers={timers} now={now} onOpen={setOpenMap} />
        <RouteSection timers={timers} now={now} onOpen={setOpenMap} />
        <RankingSection refreshKey={rankKey} />
      </main>

      {openMap && (
        <MapDialog
          map={openMap}
          timers={timers[openMap.slug] ?? []}
          pins={payload?.pins ?? []}
          now={now}
          onClose={() => setOpenMap(null)}
          onReported={onReported}
          notify={notify}
        />
      )}

      {toast && (
        <Toast message={toast.msg} tone={toast.tone} onDone={() => setToast(null)} />
      )}
    </>
  );
}
