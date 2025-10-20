// app/login/page.tsx
import React from 'react';
import LoginClient from './LoginClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function LoginPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const next = typeof searchParams?.next === 'string' && searchParams.next ? searchParams.next : '/dashboard';
  return (
    <main className="min-h-[100vh] bg-neutral-950 text-white">
      <section className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-white/70">Choose email (magic link) or phone (Nepal-only) on the next screen.</p>
        <div className="mt-6">
          <LoginClient nextPath={next} />
        </div>
      </section>
    </main>
  );
}
