const WINDOW_MS = 60_000;
const MAX_REQUESTS = 180;

export function createRateLimiter(now = Date.now) {
  const counters = new Map();

  return (key) => {
    const time = now();
    if (counters.size > 2_000) {
      for (const [id, bucket] of counters) {
        if (bucket.expiresAt <= time) counters.delete(id);
      }
    }
    const bucket = counters.get(key);
    if (!bucket || bucket.expiresAt <= time) {
      counters.set(key, { count: 1, expiresAt: time + WINDOW_MS });
      return true;
    }
    if (bucket.count >= MAX_REQUESTS) return false;
    bucket.count += 1;
    return true;
  };
}
