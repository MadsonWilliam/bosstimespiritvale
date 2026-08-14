"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useApp } from "@/components/Providers";
import { CHANNELS, ELEMENTS, minimapUrl, type BossMap, type Channel } from "@/data/game";
import type { ChannelTimer } from "@/lib/timers";
import { formatClock, parseTimeInput } from "@/lib/time-input";
import { Countdown, StateBadge, TimerProgress, TombIcon } from "@/components/ui";
import type { StatePayload } from "@/app/api/state/route";

type Pin = StatePayload["pins"][number];

export function MapDialog({
  map,
  timers,
  pins,
  now,
  onClose,
  onReported,
  notify,
}: {
  map: BossMap;
  timers: ChannelTimer[];
  pins: Pin[];
  now: number;
  onClose: () => void;
  onReported: () => void;
  notify: (msg: string, tone?: "ok" | "error") => void;
}) {
  const { prefs, identity, setIdentity, t } = useApp();
  const [channel, setChannel] = useState<Channel>(1);
  const [pinMode, setPinMode] = useState(false);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const channelPins = useMemo(
    () => pins.filter((p) => p.map_slug === map.slug && p.channel === channel),
    [pins, map.slug, channel],
  );
  const bestPin = channelPins[0] ?? null;
  const timer = timers.find((x) => x.channel === channel) ?? timers[0];

  const credentials = identity ? { nick: identity.nick, pin: identity.pin } : {};

  function applyAward(awarded: number) {
    if (identity && awarded > 0) {
      setIdentity({ ...identity, points: identity.points + awarded, reports: identity.reports + 1 });
    }
  }

  async function post(url: string, body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credentials, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(
          res.status === 429
            ? t("report.ratelimited")
            : data.error === "bad_pin"
              ? t("identity.badpin")
              : t("report.error"),
          "error",
        );
        return false;
      }
      applyAward(data.awarded ?? 0);
      onReported();
      return true;
    } catch {
      notify(t("report.error"), "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function reportDeath(at: number) {
    if (await post("/api/report", { kind: "death", server: prefs.server, mapSlug: map.slug, channel, at })) {
      notify(t("report.saved"));
    }
  }

  /** `diedAt` comes from the clock printed on the tombstone, when readable. */
  async function reportSighting(tombPresent: boolean, diedAt?: number | null) {
    if (
      await post("/api/report", {
        kind: "sighting",
        server: prefs.server,
        mapSlug: map.slug,
        channel,
        at: Date.now(),
        tombPresent,
        ...(diedAt ? { diedAt } : {}),
      })
    ) {
      notify(t("report.saved"));
    }
  }

  async function savePin() {
    if (!draftPin) return;
    if (await post("/api/pins", { mapSlug: map.slug, channel, x: draftPin.x, y: draftPin.y })) {
      notify(t("maps.tomb.saved"));
      setDraftPin(null);
      setPinMode(false);
    }
  }

  async function confirmPin(pinId: number) {
    if (!identity) {
      notify(t("identity.anon.hint"), "error");
      return;
    }
    if (await post("/api/pins", { pinId })) notify(t("maps.tomb.confirmed"));
  }

  const el = map.boss ? ELEMENTS[map.boss.element] : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-title"
      onClick={onClose}
    >
      <div
        className="animate-rise panel flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-b-none sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-edge p-5">
          <div className="min-w-0 flex-1">
            <h2 id="map-title" className="truncate text-xl font-bold sm:text-2xl">
              {map.name}
            </h2>
            {map.boss && el ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
                <span className="font-semibold text-ink">{map.boss.name}</span>
                <span className="tabular rounded border border-edge px-1.5 py-0.5 text-[11px] text-muted">
                  {t("maps.level")} {map.boss.level}
                </span>
                <span
                  className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{ color: el.color, background: `${el.color}18` }}
                >
                  {el[prefs.lang]}
                </span>
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-faint">{t("maps.boss.tba")}</p>
            )}
            {map.boss && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {map.boss.drops.map((d) => (
                  <span
                    key={d}
                    className="rounded-md border border-imperial/25 bg-imperial/8 px-2 py-0.5 text-[11px] text-imperial/90"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg border border-edge p-2 text-muted transition-colors hover:text-ink"
            aria-label={t("maps.close")}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-hidden">
          <div className="min-w-0 border-b border-edge p-5 lg:border-b-0 lg:border-r lg:overflow-y-auto">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <ChannelTabs
                value={channel}
                onChange={(c) => {
                  setChannel(c);
                  setDraftPin(null);
                }}
                timers={timers}
              />
              <button
                onClick={() => {
                  setPinMode((v) => !v);
                  setDraftPin(null);
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  pinMode
                    ? "border-spirit/50 bg-spirit/15 text-spirit"
                    : "border-edge text-muted hover:text-ink"
                }`}
              >
                <TombIcon />
                {pinMode ? t("maps.tomb.cancel") : t("maps.tomb.pin")}
              </button>
            </div>

            <Minimap
              map={map}
              pins={channelPins}
              draft={draftPin}
              pinMode={pinMode}
              onPick={setDraftPin}
              hint={t("maps.tomb.click")}
            />

            <div className="mt-3 space-y-2">
              {draftPin && (
                <button
                  onClick={savePin}
                  disabled={busy}
                  className="w-full rounded-lg bg-spirit px-4 py-2.5 text-sm font-bold text-void transition-colors hover:bg-spirit-deep disabled:opacity-50"
                >
                  {t("maps.tomb.confirm")}
                </button>
              )}
              {!pinMode && bestPin && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-imperial/25 bg-imperial/8 px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5 text-imperial/90">
                    <TombIcon />
                    {bestPin.votes} {t("maps.tomb.votes")}
                    {bestPin.nick && <span className="text-faint"> · {bestPin.nick}</span>}
                  </span>
                  <button
                    onClick={() => confirmPin(bestPin.id)}
                    disabled={busy}
                    className="shrink-0 rounded-md border border-edge px-2.5 py-1 font-semibold text-muted transition-colors hover:border-spirit/50 hover:text-spirit disabled:opacity-50"
                  >
                    +1
                  </button>
                </div>
              )}
              {!pinMode && !bestPin && (
                <p className="rounded-lg border border-dashed border-edge px-3 py-2.5 text-xs text-faint">
                  {t("maps.tomb.none")}
                </p>
              )}
            </div>
          </div>

          <div className="min-w-0 p-5 lg:overflow-y-auto">
            <ChannelStatus timer={timer} now={now} />
            <ReportControls
              busy={busy}
              onDeath={reportDeath}
              onSighting={reportSighting}
              disabled={!map.boss}
            />
            {!identity && (
              <p className="mt-4 rounded-lg border border-edge bg-abyss/60 p-3 text-xs leading-relaxed text-faint">
                {t("identity.anon.hint")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelTabs({
  value,
  onChange,
  timers,
}: {
  value: Channel;
  onChange: (c: Channel) => void;
  timers: ChannelTimer[];
}) {
  const { t } = useApp();
  return (
    <div className="flex gap-1 rounded-lg border border-edge bg-abyss p-1">
      {CHANNELS.map((c) => {
        const timer = timers.find((x) => x.channel === c);
        const active = value === c;
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
              active ? "bg-white/10 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t("common.channel")} {c}
            {timer && (
              <span
                className="size-1.5 rounded-full"
                style={{
                  background:
                    timer.state === "alive"
                      ? "#34d399"
                      : timer.state === "window"
                        ? "#fbbf24"
                        : timer.state === "waiting"
                          ? "#60a5fa"
                          : timer.state === "overdue"
                            ? "#f87171"
                            : "#3f3f46",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function ChannelStatus({ timer, now }: { timer: ChannelTimer | undefined; now: number }) {
  const { prefs, t } = useApp();
  if (!timer) return null;

  const target =
    timer.state === "waiting" ? timer.opensAt : timer.state === "window" ? timer.closesAt : null;

  return (
    <div className="panel-flat mb-5 p-4">
      <div className="flex items-center justify-between gap-2">
        <StateBadge state={timer.state} t={t} />
        {target !== null && (
          <span className="text-xs text-muted">
            {t(timer.state === "waiting" ? "timer.opens" : "timer.closes")}{" "}
            <Countdown target={target} now={now} className="text-ink" />
          </span>
        )}
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-muted">{t(`state.${timer.state}.desc`)}</p>

      {timer.opensAt !== null && timer.closesAt !== null && (
        <div className="mt-3 space-y-2">
          <div className="tabular flex justify-between text-[11px] text-faint">
            <span>{formatClock(timer.opensAt, prefs.tz, prefs.hour12)}</span>
            <span className="uppercase tracking-wider">{t("timer.window")}</span>
            <span>{formatClock(timer.closesAt, prefs.tz, prefs.hour12)}</span>
          </div>
          <TimerProgress value={timer.progress} state={timer.state} t={t} />
          <div className="text-right text-[10px] uppercase tracking-wider text-faint">
            {t("timer.progress")}
          </div>
        </div>
      )}

      {timer.lastDeath && (
        <p className="mt-3 border-t border-edge pt-3 text-[11px] text-faint">
          {t("timer.lastdeath")}:{" "}
          <span className="tabular text-muted">
            {formatClock(timer.lastDeath.diedAt, prefs.tz, prefs.hour12)}
          </span>
          {timer.lastDeath.reporter && (
            <>
              {" "}
              {t("timer.by")} <span className="text-muted">{timer.lastDeath.reporter}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

function ReportControls({
  busy,
  onDeath,
  onSighting,
  disabled,
}: {
  busy: boolean;
  onDeath: (at: number) => void;
  onSighting: (tombPresent: boolean, diedAt?: number | null) => void;
  disabled: boolean;
}) {
  const { prefs, t } = useApp();
  const [raw, setRaw] = useState("");
  const [invalid, setInvalid] = useState(false);
  /** Open when the visitor says the tombstone is there and may know its time. */
  const [tombOpen, setTombOpen] = useState(false);
  const [tombRaw, setTombRaw] = useState("");

  const preview = useMemo(() => {
    if (!raw.trim()) return null;
    const parsed = parseTimeInput(raw, prefs.tz);
    return parsed.ok ? parsed.at : null;
  }, [raw, prefs.tz]);

  const tombPreview = useMemo(() => {
    if (!tombRaw.trim()) return null;
    const parsed = parseTimeInput(tombRaw, prefs.tz);
    return parsed.ok ? parsed.at : null;
  }, [tombRaw, prefs.tz]);

  function submit() {
    if (disabled || busy) return;
    if (!raw.trim()) {
      onDeath(Date.now());
      return;
    }
    const parsed = parseTimeInput(raw, prefs.tz);
    if (!parsed.ok) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onDeath(parsed.at);
    setRaw("");
  }

  function sendTomb() {
    onSighting(true, tombPreview);
    setTombOpen(false);
    setTombRaw("");
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-faint">
          {t("report.when")}
        </label>
        <div className="flex gap-2">
          <input
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setInvalid(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={t("report.placeholder")}
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            className={`tabular min-w-0 flex-1 rounded-lg border bg-abyss px-3 py-2.5 text-sm outline-none transition-colors disabled:opacity-40 ${
              invalid ? "border-overdue/60" : "border-edge focus:border-spirit/60"
            }`}
          />
          <button
            onClick={submit}
            disabled={disabled || busy}
            className="shrink-0 rounded-lg bg-spirit px-4 py-2.5 text-sm font-bold text-void transition-colors hover:bg-spirit-deep disabled:opacity-40"
          >
            {t("report.submit")}
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          {t("report.hint")}
          {preview !== null && (
            <>
              {" — "}
              <span className="tabular text-spirit">
                {formatClock(preview, prefs.tz, prefs.hour12)}
              </span>
            </>
          )}
        </p>
      </div>

      <button
        onClick={() => onDeath(Date.now())}
        disabled={disabled || busy}
        className="w-full rounded-lg border border-overdue/40 bg-overdue/10 px-4 py-2.5 text-sm font-bold text-overdue transition-colors hover:bg-overdue/20 disabled:opacity-40"
      >
        {t("report.now")}
      </button>

      <div className="border-t border-edge pt-4">
        <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-faint">
          <TombIcon />
          {t("report.tomb")}
        </span>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTombOpen((v) => !v)}
            disabled={disabled || busy}
            aria-expanded={tombOpen}
            className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
              tombOpen
                ? "border-waiting bg-waiting/20 text-waiting"
                : "border-waiting/35 bg-waiting/8 text-waiting hover:bg-waiting/16"
            }`}
          >
            {t("report.tomb.present")}
            <span className="mt-0.5 block text-[10px] font-normal opacity-70">
              {t("report.tomb.present.hint")}
            </span>
          </button>
          <button
            onClick={() => onSighting(false)}
            disabled={disabled || busy}
            className="rounded-lg border border-alive/35 bg-alive/8 px-3 py-2.5 text-xs font-semibold text-alive transition-colors hover:bg-alive/16 disabled:opacity-40"
          >
            {t("report.tomb.gone")}
            <span className="mt-0.5 block text-[10px] font-normal opacity-70">
              {t("report.tomb.gone.hint")}
            </span>
          </button>
        </div>

        {tombOpen && (
          <div className="animate-rise mt-2 rounded-lg border border-waiting/30 bg-waiting/6 p-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-waiting/80">
              {t("report.tomb.time")}
            </label>
            <input
              value={tombRaw}
              onChange={(e) => setTombRaw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTomb()}
              placeholder={t("report.placeholder")}
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              className="tabular w-full rounded-lg border border-edge bg-abyss px-3 py-2 text-sm outline-none transition-colors focus:border-waiting/60"
            />
            <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
              {t("report.tomb.time.hint")}
              {tombPreview !== null && (
                <>
                  {" — "}
                  <span className="tabular text-waiting">
                    {formatClock(tombPreview, prefs.tz, prefs.hour12)}
                  </span>
                </>
              )}
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                onClick={sendTomb}
                disabled={busy}
                className="flex-1 rounded-lg bg-waiting px-3 py-2 text-xs font-bold text-void transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {t("report.tomb.send")}
              </button>
              <button
                onClick={() => {
                  setTombRaw("");
                  onSighting(true, null);
                  setTombOpen(false);
                }}
                disabled={busy}
                className="rounded-lg border border-edge px-3 py-2 text-xs font-semibold text-muted transition-colors hover:text-ink disabled:opacity-40"
              >
                {t("report.tomb.skip")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Minimap({
  map,
  pins,
  draft,
  pinMode,
  onPick,
  hint,
}: {
  map: BossMap;
  pins: Pin[];
  draft: { x: number; y: number } | null;
  pinMode: boolean;
  onPick: (p: { x: number; y: number }) => void;
  hint: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleClick(e: React.MouseEvent) {
    if (!pinMode || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    onPick({
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    });
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`relative aspect-square w-full overflow-hidden rounded-xl border border-edge bg-abyss ${
        pinMode ? "cursor-crosshair ring-2 ring-spirit/60" : ""
      }`}
    >
      <Image
        src={minimapUrl(map.slug)}
        alt={map.name}
        fill
        sizes="(max-width: 1024px) 92vw, 640px"
        className="object-cover"
      />

      {pins.map((p, i) => (
        <TombMarker key={p.id} x={p.x} y={p.y} primary={i === 0} votes={p.votes} />
      ))}
      {draft && <TombMarker x={draft.x} y={draft.y} primary draft />}

      {pinMode && !draft && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 text-center text-xs font-semibold text-spirit">
          {hint}
        </div>
      )}
    </div>
  );
}

/**
 * A real map pin rather than a dot: the tip marks the exact tile, and the head
 * stays legible over bright minimaps like Sunny Meadows.
 */
function TombMarker({
  x,
  y,
  primary,
  votes,
  draft,
}: {
  x: number;
  y: number;
  primary: boolean;
  votes?: number;
  draft?: boolean;
}) {
  const color = draft ? "#5eead4" : primary ? "#fbbf24" : "#a1a1b5";
  return (
    <div
      className={`pointer-events-none absolute -translate-x-1/2 -translate-y-full ${
        draft ? "animate-bounce" : ""
      }`}
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      title={votes ? `${votes}` : undefined}
    >
      <svg width="34" height="44" viewBox="0 0 34 44" fill="none">
        {/* Halo on the ground so the tip is findable on busy terrain */}
        <ellipse cx="17" cy="41" rx="7" ry="2.5" fill={color} opacity="0.35" />
        <path
          d="M17 41C17 41 30 26.5 30 16.5A13 13 0 1 0 4 16.5C4 26.5 17 41 17 41Z"
          fill={color}
          stroke="#06060a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Tombstone glyph punched out of the pin head */}
        <path
          d="M12.5 23v-7a4.5 4.5 0 0 1 9 0v7"
          stroke="#06060a"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path d="M11 23h12" stroke="#06060a" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M17 13v4.5M14.75 15.25h4.5" stroke="#06060a" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}
