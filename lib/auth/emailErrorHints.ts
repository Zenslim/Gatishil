function extractMessage(err: unknown): string | null {
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const message = (err as any)?.message || (err as any)?.error_description || (err as any)?.error;
    return typeof message === 'string' ? message : null;
  }
  return null;
}

export function getFriendlySupabaseEmailError(err: unknown): string | null {
  const message = extractMessage(err);
  if (!message) return null;
  if (message.toLowerCase().includes('database error saving new user')) {
    return (
      'Email sign-up is temporarily unavailable because Supabase rejected the new user record. ' +
      'Inspect the Supabase auth logs for "Database error saving new user"—usually caused by a broken profiles trigger or row-level security policy—and then retry, or use the phone OTP option instead.'
    );
  }
  return null;
}
