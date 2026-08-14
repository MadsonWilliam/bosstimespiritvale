"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/Providers";
import { SERVERS, SERVER_LABELS, type ServerId } from "@/data/game";
import { formatClock } from "@/lib/time-input";
import { SettingsDialog } from "@/components/SettingsDialog";
import { IdentityPanel } from "@/components/IdentityPanel";
import { useNow } from "@/components/ui";

const NAV = [
  { href: "#mapas", key: "nav.maps" },
  { href: "#timers", key: "nav.timers" },
  { href: "#rota", key: "nav.route" },
  { href: "#ranking", key: "nav.ranking" },
];

export function Header() {
  const { prefs, setPrefs, identity, hydrating, t } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const now = useNow(1000);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const firstRun = !hydrating && !prefs.configured;

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b transition-colors ${
          scrolled ? "border-edge bg-void/85 backdrop-blur-xl" : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <a href="#top" className="group flex shrink-0 items-center gap-2.5">
            <Sigil />
            <span className="leading-none">
              <span className="block text-[13px] font-black uppercase tracking-[0.14em] text-ink sm:text-sm">
                Nojos Boss Time
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.28em] text-spirit/70">
                Spirit Vale
              </span>
            </span>
          </a>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-ink"
              >
                {t(n.key)}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ServerSwitch value={prefs.server} onChange={(s) => setPrefs({ server: s })} />

            <button
              onClick={() => setShowSettings(true)}
              className="hidden items-center gap-2 rounded-lg border border-edge bg-surface px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-edge-strong hover:text-ink sm:flex"
              title={t("settings.open")}
            >
              <span className="tabular text-ink">{formatClock(now, prefs.tz, prefs.hour12)}</span>
              <span className="text-faint">·</span>
              <GearIcon />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-edge bg-surface p-2 text-muted transition-colors hover:text-ink sm:hidden"
              aria-label={t("settings.open")}
            >
              <GearIcon />
            </button>

            <button
              onClick={() => setShowIdentity(true)}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors"
              style={
                identity
                  ? {
                      borderColor: `${identity.rank.color}55`,
                      background: `${identity.rank.color}12`,
                      color: identity.rank.color,
                    }
                  : { borderColor: "var(--color-edge)", background: "var(--color-surface)", color: "var(--color-muted)" }
              }
            >
              <UserIcon />
              <span className="hidden max-w-28 truncate sm:inline">
                {identity ? identity.nick : t("identity.anon")}
              </span>
              {identity && <span className="tabular opacity-70">{identity.level}</span>}
            </button>
          </div>
        </div>

        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-edge/60 px-4 py-2 lg:hidden">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-white/5 hover:text-ink"
            >
              {t(n.key)}
            </a>
          ))}
        </nav>
      </header>

      {(showSettings || firstRun) && (
        <SettingsDialog firstRun={firstRun} onClose={() => setShowSettings(false)} />
      )}
      {showIdentity && <IdentityPanel onClose={() => setShowIdentity(false)} />}
    </>
  );
}

function ServerSwitch({
  value,
  onChange,
}: {
  value: ServerId;
  onChange: (s: ServerId) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ServerId)}
        aria-label="Server"
        // A fixed width keeps the collapsed control at "SA" size; without it the
        // longest option name stretches the header past the viewport on mobile.
        className="w-[4.25rem] cursor-pointer appearance-none truncate rounded-lg border border-spirit/30 bg-spirit/10 py-2 pl-3 pr-6 text-xs font-bold uppercase tracking-wider text-spirit outline-none transition-colors hover:border-spirit/60 sm:w-[11.5rem]"
      >
        {SERVERS.map((s) => (
          <option key={s} value={s} className="bg-abyss text-ink">
            {s} — {SERVER_LABELS[s]}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-spirit"
        viewBox="0 0 12 12"
        fill="none"
      >
        <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Simple mark: a tombstone silhouette inside a spirit ring. */
function Sigil() {
  return (
    <span className="relative grid size-9 place-items-center rounded-xl border border-spirit/30 bg-spirit/10">
      <svg viewBox="0 0 24 24" className="size-5 text-spirit" fill="none">
        <path
          d="M7 20V11a5 5 0 0 1 10 0v9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path d="M5 20h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M12 8.5v4.5M10 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.35.4.64.73.83"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 20a7.5 7.5 0 0 1 15 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
