// app/error.tsx
'use client';

import React from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error('GlobalError:', error);
  return (
    <html>
      <body className="min-h-[100vh] bg-neutral-950 text-white">
        <main className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-white/70">The app threw an error while rendering. You are seeing the global error boundary.</p>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-white/80">
{String(error?.message || 'Unknown error')}
{error?.digest ? `\n(digest: ${error.digest})` : ''}
          </pre>
          <div className="mt-4 flex gap-3">
            <button onClick={() => reset()} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Try again</button>
            <a href="/" className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Go home</a>
          </div>
        </main>
      </body>
    </html>
  );
}
