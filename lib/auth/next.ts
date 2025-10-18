// Single source of truth to validate and resolve the `next` redirect target.
// Only allow internal paths beginning with a single '/'. Fallback to '/dashboard'.
export function getValidatedNext(input?: string | URL | null, fallback: string = '/dashboard'): string {
  try {
    let nextParam: string | null = null;

    if (input instanceof URL) {
      nextParam = input.searchParams.get('next');
    } else if (typeof input === 'string') {
      const url = new URL(input, 'http://localhost'); // base ignored if absolute
      nextParam = url.searchParams.get('next');
    } else if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      nextParam = url.searchParams.get('next');
    }

    if (!nextParam || typeof nextParam !== 'string') return fallback;

    // defensive decode (avoid exceptions breaking flow)
    try { nextParam = decodeURIComponent(nextParam); } catch {}

    // accept only internal paths beginning with exactly one '/'
    if (!nextParam.startsWith('/') || nextParam.startsWith('//')) return fallback;
    if (nextParam.trim() === '') return fallback;

    return nextParam;
  } catch {
    return fallback;
  }
}
