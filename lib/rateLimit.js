const buckets = globalThis.__memberHubRateLimitBuckets || new Map();

if (!globalThis.__memberHubRateLimitBuckets) {
  globalThis.__memberHubRateLimitBuckets = buckets;
}

function clientAddress(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(request, { key, limit, windowMs }) {
  const now = Date.now();
  const bucketKey = `${key}:${clientAddress(request)}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfter: 0 };
  }

  current.count += 1;
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));

  if (buckets.size > 10_000) {
    for (const [storedKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(storedKey);
    }
  }

  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    retryAfter
  };
}
