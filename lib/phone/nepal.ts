export function normalizeNepalToDB(phone: string) {
  const raw = String(phone || '').trim().replace(/[\s-]/g, '');
  const plus = raw.startsWith('+') ? raw : `+${raw}`;
  if (!plus.startsWith('+977')) return null;
  const e164NoPlus = plus.slice(1);
  if (!/^9779\d{9}$/.test(e164NoPlus)) return null;
  return e164NoPlus;
}
