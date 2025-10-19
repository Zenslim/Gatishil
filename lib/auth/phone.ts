export const NEPAL_MOBILE = /^\+9779\d{9}$/;

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

export function normalizeNepalMobile(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  if (!digits) return null;

  let normalized = digits;
  if (normalized.startsWith('+')) {
    normalized = normalized.slice(1);
  }

  if (normalized.startsWith('977')) {
    normalized = normalized.slice(3);
  }

  if (normalized.startsWith('0')) {
    normalized = normalized.replace(/^0+/, '');
  }

  if (normalized.length !== 10 || !normalized.startsWith('98')) {
    return null;
  }

  return `+977${normalized}`;
}
