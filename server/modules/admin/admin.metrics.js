const startedAt = Date.now();
const buckets = new Map();
const WINDOW_MINUTES = 60;

export function recordApiRequest(status, durationMs, now = Date.now()) {
  const minute = Math.floor(now / 60000) * 60000;
  const bucket = buckets.get(minute) ?? { requests: 0, errors: 0, total_ms: 0 };
  bucket.requests += 1;
  bucket.errors += status >= 500 ? 1 : 0;
  bucket.total_ms += durationMs;
  buckets.set(minute, bucket);
  for (const key of buckets.keys()) if (key < minute - (WINDOW_MINUTES - 1) * 60000) buckets.delete(key);
}

export function getApiMetrics(now = Date.now()) {
  const first = Math.floor(now / 60000) * 60000 - (WINDOW_MINUTES - 1) * 60000;
  const series = Array.from({ length: WINDOW_MINUTES }, (_, index) => {
    const minute = first + index * 60000;
    const bucket = buckets.get(minute);
    return { minute: new Date(minute).toISOString(), requests: bucket?.requests ?? 0, errors: bucket?.errors ?? 0 };
  });
  const requests = series.reduce((sum, bucket) => sum + bucket.requests, 0);
  const errors = series.reduce((sum, bucket) => sum + bucket.errors, 0);
  const totalMs = series.reduce((sum, bucket) => sum + (buckets.get(Date.parse(bucket.minute))?.total_ms ?? 0), 0);
  return { requests, errors, average_ms: requests ? Math.round(totalMs / requests) : null, series, uptime_seconds: Math.floor((now - startedAt) / 1000) };
}
