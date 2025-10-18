export function normalizeNepal(phone: string) {
  const raw = (phone || '').replace(/[\s-]/g, '');
  if (!raw) return null;
  const plus = raw.startsWith('+') ? raw : `+${raw}`;
  if (!plus.startsWith('+977')) return null;
  const digits = plus.slice(1);
  if (!/^\d+$/.test(digits)) return null;
  return digits;
}
