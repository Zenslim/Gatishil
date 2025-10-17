// Simple in-memory token bucket for dev; stateless hosts will reset per lambda
// Good enough as an app-level guard; Supabase still enforces its own limits.
type Bucket = { tokens: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function canSendOtp(key: string, max = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { tokens: max, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (b.tokens <= 0) return false;
  b.tokens -= 1;
  return true;
}
