/**
 * In-memory token bucket. Good enough for a single-container community site:
 * it blunts accidental loops and casual spam without needing Redis. If the
 * site ever runs more than one replica this has to move to the database.
 */

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (now - b.updatedAt > SWEEP_INTERVAL_MS) buckets.delete(key);
  }
}

export function allow(
  key: string,
  { capacity, refillPerMinute }: { capacity: number; refillPerMinute: number },
): boolean {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  const refill = ((now - bucket.updatedAt) / 60000) * refillPerMinute;
  bucket.tokens = Math.min(capacity, bucket.tokens + refill);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}

/**
 * Best-effort client identity. Behind EasyPanel's proxy the real address is in
 * x-forwarded-for; falling back to a constant just means the limit becomes
 * global, which fails safe.
 */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
