// app/error.tsx
'use client';

import React from 'react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  console.error('GlobalError digest?', (error as any)?.digest, error);

  return (
    <html>
      <body className="min-h-screen bg-neutral-950 text-white">
        <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
          <div>
            <h1 className="text-2xl font-semibold">Something went wrong.</h1>
            <p className="mt-2 text-sm text-white/70">
              We hit an unexpected error while rendering this page. Try again, or head back home while we investigate.
            </p>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/70">
            <p className="font-semibold uppercase tracking-wide text-white/60">Error details</p>
            <p className="whitespace-pre-wrap break-words text-white/70">{error.message}</p>
            {Boolean((error as any)?.digest) && (
              <p className="text-white/40">Digest: {(error as any)?.digest}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/15"
            >
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
