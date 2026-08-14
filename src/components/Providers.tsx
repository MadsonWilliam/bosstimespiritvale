"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ServerId } from "@/data/game";
import { DEFAULT_LANG, translator, type Lang, type T } from "@/lib/i18n";
import { detectTimezone } from "@/lib/time-input";
import type { Rank } from "@/lib/ranks";

const PREFS_KEY = "nbt.prefs.v1";
const IDENTITY_KEY = "nbt.identity.v1";

export type Prefs = {
  lang: Lang;
  tz: string;
  hour12: boolean;
  server: ServerId;
  /** False until the visitor has been through the first-run settings gate. */
  configured: boolean;
};

const FALLBACK_PREFS: Prefs = {
  lang: DEFAULT_LANG,
  tz: "America/Sao_Paulo",
  hour12: false,
  server: "SA",
  configured: false,
};

export type Identity = {
  nick: string;
  /** Kept client-side only; re-sent to prove ownership of the nick. */
  pin: string;
  points: number;
  reports: number;
  level: number;
  progress: number;
  rank: Rank;
  next: Rank | null;
};

type Ctx = {
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
  /** True until localStorage has been read, so the UI can avoid a wrong flash. */
  hydrating: boolean;
  t: T;
  identity: Identity | null;
  setIdentity: (id: Identity | null) => void;
};

const PrefsContext = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("useApp must be used inside <Providers>");
  return ctx;
}

export function Providers({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(FALLBACK_PREFS);
  const [identity, setIdentityState] = useState<Identity | null>(null);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      const detected = detectTimezone();
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Prefs>;
        setPrefsState({ ...FALLBACK_PREFS, tz: detected, ...parsed });
      } else {
        // Pre-fill from the browser but still make the visitor confirm it.
        setPrefsState({
          ...FALLBACK_PREFS,
          tz: detected,
          lang: navigator.language?.toLowerCase().startsWith("pt") ? "pt" : "en",
        });
      }
      const rawId = localStorage.getItem(IDENTITY_KEY);
      if (rawId) setIdentityState(JSON.parse(rawId) as Identity);
    } catch {
      // Private mode or corrupted storage: run on defaults.
    }
    setHydrating(false);
  }, []);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — prefs stay for this session only */
      }
      return next;
    });
  }, []);

  const setIdentity = useCallback((id: Identity | null) => {
    setIdentityState(id);
    try {
      if (id) localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
      else localStorage.removeItem(IDENTITY_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = prefs.lang === "pt" ? "pt-BR" : "en";
  }, [prefs.lang]);

  const value = useMemo<Ctx>(
    () => ({
      prefs,
      setPrefs,
      hydrating,
      t: translator(prefs.lang),
      identity,
      setIdentity,
    }),
    [prefs, setPrefs, hydrating, identity, setIdentity],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}
