export function isPhone(input: string) {
  // Accepts +977… and general E.164; very light validation
  return /^\+\d{7,15}$/.test(input.trim());
}

export function isEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

export function maskIdentifier(input: string) {
  const s = input.trim();
  if (isEmail(s)) {
    const [u, d] = s.split('@');
    const mu = u.length <= 2 ? u[0] + '' : u[0] + '' + u.slice(-1);
    return `${mu}@${d}`;
  }
  if (isPhone(s)) {
    return s.slice(0, 3) + '****' + s.slice(-2);
  }
  return 'your contact';
}
