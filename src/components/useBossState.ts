"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StatePayload } from "@/app/api/state/route";
import { BOSS_MAPS, CHANNELS, type ServerId } from "@/data/game";
import { computeChannelTimer, type ChannelTimer } from "@/lib/timers";

const POLL_MS = 20_000;

export type BossStateData = {
  payload: StatePayload | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
};

export function useServerState(server: ServerId): BossStateData {
  const [payload, setPayload] = useState<StatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (silent: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/state?server=${server}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        setPayload(await res.json());
        setError(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [server],
  );

  useEffect(() => {
    setPayload(null);
    load(false);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      // Polling a hidden tab just burns the visitor's battery.
      if (document.visibilityState === "visible") load(true);
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load(true);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    payload,
    loading,
    error,
    refresh: useCallback(() => load(true), [load]),
  };
}

/**
 * Derives live timers for every map/channel. Recomputed on each `now` tick so
 * states flip from "waiting" to "in window" without waiting for a poll.
 */
export function useTimers(
  payload: StatePayload | null,
  now: number,
): Record<string, ChannelTimer[]> {
  return useMemo(() => {
    const out: Record<string, ChannelTimer[]> = {};
    for (const map of BOSS_MAPS) {
      if (!map.boss) continue;
      out[map.slug] = CHANNELS.map((channel) => {
        const r = payload?.reports[`${map.slug}:${channel}`];
        return computeChannelTimer(channel, r?.death ?? null, r?.sighting ?? null, now);
      });
    }
    return out;
  }, [payload, now]);
}
