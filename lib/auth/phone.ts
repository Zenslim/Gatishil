export const NEPAL_MOBILE = /^\+97798\d{8}$/;

export function normalizeOtpPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const raw = trimmed.replace(/[\s-]/g, '');
  if (!raw) return '';
  const prefixed = raw.startsWith('+') ? raw : `+${raw}`;
  const digits = prefixed.replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) {
    return '';
  }
  if (!prefixed.startsWith('+977')) {
    return prefixed;
  }
  return `+${digits}`;
}
