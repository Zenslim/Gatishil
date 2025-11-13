// lib/phone.ts
// Canonicalize Nepal phone numbers to '9779XXXXXXXXX' without '+'.
export function toCanonicalNepalPhone(input: string): string | null {
  if (!input) return null;
  let s = input.trim();
  // Remove spaces, dashes, parentheses
  s = s.replace(/[\s\-()]/g, '');
  // Strip leading '+'
  if (s.startsWith('+')) s = s.slice(1);
  // If starts with '0', convert to '977' (e.g., 98XXXXXXXX -> 97798XXXXXXXX)
  if (s.startsWith('0')) s = '977' + s.slice(1);
  // If starts with '9' and length 10, assume local mobile and prefix 977
  if (s.length === 10 && s.startsWith('9')) s = '977' + s;
  // Now require canonical 12-digit '9779XXXXXXXXX'
  if (/^9779\d{8}$/.test(s)) return s;
  return null;
}

export function isCanonicalNepalPhone(s: string): boolean {
  return /^9779\d{8}$/.test(s);
}
