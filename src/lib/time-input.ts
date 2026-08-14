/**
 * Parsing of "when did it die" typed by someone who is mid-raid and does not
 * want to fight a date picker.
 *
 * Accepts 2100, 21:00, 21h, 9:00pm, 930, 9 30 pm, -15 (fifteen minutes ago).
 * Everything is interpreted in the viewer's chosen timezone and resolved to
 * the most recent matching instant in the past.
 */

export type ParsedTime =
  | { ok: true; at: number; relative: boolean }
  | { ok: false; error: "empty" | "unparseable" | "future" };

/** Offset of `tz` from UTC, in minutes, at instant `at`. */
function tzOffsetMinutes(tz: string, at: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(at)).map((p) => [p.type, p.value]),
  );
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUTC - Math.floor(at / 1000) * 1000) / 60000;
}

/** Wall-clock hour/minute in `tz` -> epoch ms, resolving to the recent past. */
export function wallClockToEpoch(
  hour: number,
  minute: number,
  tz: string,
  now = Date.now(),
): number {
  // Two passes: the offset can change across the DST boundary we just crossed.
  let guess = now;
  for (let i = 0; i < 2; i++) {
    const offset = tzOffsetMinutes(tz, guess);
    const local = new Date(now + offset * 60000);
    const utcMidnight = Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate(),
    );
    guess = utcMidnight + (hour * 60 + minute - offset) * 60000;
  }
  // A time "later today" must mean yesterday — you cannot report a future kill.
  if (guess > now + 60000) guess -= 24 * 60 * 60 * 1000;
  return guess;
}

export function parseTimeInput(
  raw: string,
  tz: string,
  now = Date.now(),
): ParsedTime {
  const input = raw.trim().toLowerCase();
  if (!input) return { ok: false, error: "empty" };

  // "-15" / "15 min atrás" style: minutes ago.
  const relative = input.match(/^-\s*(\d{1,3})\s*(m|min|mins|minutos?|minutes?)?$/);
  if (relative) {
    const mins = Number(relative[1]);
    return { ok: true, at: now - mins * 60000, relative: true };
  }

  const meridiem = /(^|[^a-z])(am|pm)([^a-z]|$)/.exec(input)?.[2] as
    | "am"
    | "pm"
    | undefined;

  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return { ok: false, error: "unparseable" };

  let hour: number;
  let minute: number;

  if (/[:h.\s]/.test(input) && /\d[:h.\s]+\d/.test(input)) {
    // Explicit separator: 21:00, 21h00, 9.05, "9 30"
    const m = input.match(/(\d{1,2})\s*[:h.\s]+\s*(\d{1,2})/);
    if (!m) return { ok: false, error: "unparseable" };
    hour = Number(m[1]);
    minute = Number(m[2]);
  } else if (digits.length <= 2) {
    // "21", "9" -> top of the hour
    hour = Number(digits);
    minute = 0;
  } else if (digits.length === 3) {
    // "930" -> 9:30
    hour = Number(digits.slice(0, 1));
    minute = Number(digits.slice(1));
  } else if (digits.length === 4) {
    // "2100" -> 21:00
    hour = Number(digits.slice(0, 2));
    minute = Number(digits.slice(2));
  } else {
    return { ok: false, error: "unparseable" };
  }

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  if (hour > 23 || minute > 59) return { ok: false, error: "unparseable" };

  return { ok: true, at: wallClockToEpoch(hour, minute, tz, now), relative: false };
}

export function formatClock(
  at: number,
  tz: string,
  hour12: boolean,
  withSeconds = false,
): string {
  return new Intl.DateTimeFormat(hour12 ? "en-US" : "pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" as const } : {}),
    hour12,
  }).format(new Date(at));
}

/** A short, deduplicated list of timezones that actually matter to this game. */
export const COMMON_TIMEZONES = [
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Berlin",
  "Europe/Warsaw",
  "Europe/Moscow",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Manila",
  "Asia/Tokyo",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
