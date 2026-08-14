"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/Providers";
import { RANKS } from "@/lib/ranks";

/**
 * "Login" without accounts: a nickname plus a 4-digit PIN that only exists to
 * stop someone spending another player's reputation. No email, no recovery.
 */
export function IdentityPanel({ onClose }: { onClose: () => void }) {
  const { identity, setIdentity, prefs, t } = useApp();
  const [nick, setNick] = useState(identity?.nick ?? "");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nick, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "bad_pin" ? t("identity.badpin") : t("common.error"));
        return;
      }
      setIdentity({ ...data.user, pin });
      onClose();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-title"
      onClick={onClose}
    >
      <div
        className="animate-rise panel max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-b-none p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="identity-title" className="text-xl font-bold">
          {t("identity.title")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("identity.hint")}</p>

        {identity ? (
          <div className="mt-5 space-y-4">
            <div className="panel-flat p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-lg font-bold">{identity.nick}</span>
                <span
                  className="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                  style={{
                    color: identity.rank.color,
                    borderColor: `${identity.rank.color}55`,
                    background: `${identity.rank.color}14`,
                  }}
                >
                  {t("identity.level")} {identity.level}
                </span>
              </div>
              <div
                className="mt-1 text-sm font-semibold"
                style={{ color: identity.rank.color }}
              >
                {identity.rank[prefs.lang]}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(identity.progress * 100)}%`,
                    background: identity.rank.color,
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-faint">
                <span className="tabular">
                  {identity.points} {t("identity.points")}
                </span>
                {identity.next && (
                  <span>
                    {t("identity.nextrank")}: {identity.next.minPoints}
                  </span>
                )}
              </div>
            </div>

            <RankLadder points={identity.points} />

            <button
              onClick={() => {
                setIdentity(null);
                onClose();
              }}
              className="w-full rounded-xl border border-edge px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-overdue/50 hover:text-overdue"
            >
              {t("identity.leave")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-faint">
                {t("identity.nick")}
              </span>
              <input
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={16}
                placeholder="Nojo"
                className="w-full rounded-lg border border-edge bg-abyss px-3 py-2.5 text-sm outline-none transition-colors focus:border-spirit/60"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-faint">
                {t("identity.pin")}
              </span>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="0000"
                className="tabular w-full rounded-lg border border-edge bg-abyss px-3 py-2.5 text-lg tracking-[0.5em] outline-none transition-colors focus:border-spirit/60"
              />
              <span className="mt-2 block text-xs leading-relaxed text-faint">
                {t("identity.pin.hint")}
              </span>
            </label>

            {error && <p className="text-sm text-overdue">{error}</p>}

            <button
              type="submit"
              disabled={busy || nick.trim().length < 2 || pin.length !== 4}
              className="w-full rounded-xl bg-spirit px-4 py-3 text-sm font-bold text-void transition-colors hover:bg-spirit-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("identity.enter")}
            </button>

            <p className="text-xs leading-relaxed text-faint">{t("identity.consent")}</p>
          </form>
        )}
      </div>
    </div>
  );
}

function RankLadder({ points }: { points: number }) {
  const { prefs } = useApp();
  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {RANKS.map((r) => {
        const reached = points >= r.minPoints;
        return (
          <div
            key={r.id}
            className="shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-opacity"
            style={{
              color: reached ? r.color : "var(--color-faint)",
              borderColor: reached ? `${r.color}44` : "var(--color-edge)",
              background: reached ? `${r.color}10` : "transparent",
              opacity: reached ? 1 : 0.55,
            }}
            title={`${r.minPoints}+`}
          >
            {r[prefs.lang]}
          </div>
        );
      })}
    </div>
  );
}
