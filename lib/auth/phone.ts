export const NEPAL_MOBILE = /^\+9779[678]\d{8}$/;

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

  if (normalized) {
    normalized = normalized.replace(/^0+/, '');
  }

  if (!/^9[678]\d{8}$/.test(normalized)) {
    return null;
  }

  return `+977${normalized}`;
}
