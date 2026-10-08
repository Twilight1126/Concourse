const entries = new Map();
const FRESH_FOR_MS = 10_000;
const MAX_ENTRIES = 50;
let generation = 0;

export function invalidateRequestCache() {
  generation += 1;
  entries.clear();
}

export function cachedRequest(key, load, freshForMs = FRESH_FOR_MS) {
  const existing = entries.get(key);
  if (existing?.pending) return existing.pending;
  if (existing && existing.expiresAt > Date.now()) return Promise.resolve(existing.value);

  const startedAt = generation;
  const pending = Promise.resolve().then(load);
  entries.set(key, { pending });
  pending.then(
    (value) => {
      if (generation !== startedAt || entries.get(key)?.pending !== pending) return;
      entries.delete(key);
      if (freshForMs > 0) entries.set(key, { value, expiresAt: Date.now() + freshForMs });
      if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value);
    },
    () => { if (entries.get(key)?.pending === pending) entries.delete(key); },
  );
  return pending;
}
