"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/Providers";
import { COMMON_TIMEZONES, detectTimezone, formatClock } from "@/lib/time-input";
import type { Lang } from "@/lib/i18n";

/**
 * Timezone and clock format decide how every other number on the site reads,
 * so new visitors go through this once before they see anything else.
 */
export function SettingsDialog({
  firstRun,
  onClose,
}: {
  firstRun: boolean;
  onClose: () => void;
}) {
  const { prefs, setPrefs, t } = useApp();
  const [now, setNow] = useState(() => Date.now());
  const detected = useMemo(() => detectTimezone(), []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (firstRun) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [firstRun, onClose]);

  const timezones = useMemo(() => {
    const list = [...COMMON_TIMEZONES];
    if (detected && !list.includes(detected)) list.unshift(detected);
    return list;
  }, [detected]);

  const finish = () => {
    setPrefs({ configured: true });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={firstRun ? undefined : onClose}
    >
      <div
        className="animate-rise panel max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-spirit/70">
          {t("settings.open")}
        </div>
        <h2 id="settings-title" className="text-xl font-bold">
          {firstRun ? `${t("app.name")} · ${t("app.subtitle")}` : t("settings.open")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("settings.intro")}</p>

        <div className="mt-6 space-y-5">
          <Field label={t("settings.language")}>
            <Segmented
              value={prefs.lang}
              onChange={(v) => setPrefs({ lang: v as Lang })}
              options={[
                { value: "pt", label: "Português" },
                { value: "en", label: "English" },
              ]}
            />
          </Field>

          <Field label={t("settings.timezone")}>
            <select
              value={prefs.tz}
              onChange={(e) => setPrefs({ tz: e.target.value })}
              className="w-full rounded-lg border border-edge bg-abyss px-3 py-2.5 text-sm outline-none transition-colors focus:border-spirit/60"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                  {tz === detected ? ` — ${t("settings.detected")}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("settings.format")}>
            <Segmented
              value={prefs.hour12 ? "12" : "24"}
              onChange={(v) => setPrefs({ hour12: v === "12" })}
              options={[
                { value: "24", label: t("settings.format.24h") },
                { value: "12", label: t("settings.format.12h") },
              ]}
            />
          </Field>

          <div className="panel-flat flex items-center justify-between px-4 py-3">
            <span className="text-xs uppercase tracking-wider text-faint">
              {t("common.updated")}
            </span>
            <span className="tabular text-lg font-semibold text-spirit">
              {formatClock(now, prefs.tz, prefs.hour12, true)}
            </span>
          </div>

          {firstRun && (
            <p className="rounded-lg border border-edge bg-abyss/60 p-3 text-xs leading-relaxed text-faint">
              {t("footer.privacy.short")}
            </p>
          )}
        </div>

        <button
          onClick={finish}
          className="mt-6 w-full rounded-xl bg-spirit px-4 py-3 text-sm font-bold text-void transition-colors hover:bg-spirit-deep"
        >
          {t("settings.done")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-edge bg-abyss p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            value === o.value
              ? "bg-spirit text-void"
              : "text-muted hover:bg-white/5 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
