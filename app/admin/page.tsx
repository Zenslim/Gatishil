import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import AdminClient from './AdminClient';

const allowedRoles = new Set(['admin', 'editor']);

type RoleLike = string | string[] | null | undefined;

function extractRole(roleLike: RoleLike): string | null {
  if (!roleLike) return null;
  if (Array.isArray(roleLike)) {
    return roleLike.find((value) => allowedRoles.has(value)) ?? null;
  }
  if (allowedRoles.has(roleLike)) {
    return roleLike;
  }
  return null;
}

async function resolveRole(user: any): Promise<string | null> {
  if (!user) return null;
  const meta = user.app_metadata ?? {};
  const userMeta = user.user_metadata ?? {};
  return (
    extractRole(meta.role as RoleLike) ||
    extractRole(meta.roles as RoleLike) ||
    extractRole(userMeta.role as RoleLike) ||
    extractRole(userMeta.roles as RoleLike) ||
    null
  );
}

function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        <span className="h-3 w-3 animate-ping rounded-full bg-amber-400" aria-hidden />
        <span>Loading Tina Studio…</span>
      </div>
    </div>
  );
}

function MissingConfig({ message }: { message: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/70">
      <h1 className="text-lg font-semibold text-white">CMS configuration missing</h1>
      <p>{message}</p>
      <p>
        Update your deployment environment with <code className="rounded bg-black/40 px-1">NEXT_PUBLIC_TINA_API_URL</code>
        {' '}
        and refresh this page.
      </p>
    </div>
  );
}

function Unauthorized() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-8 text-center text-sm text-rose-100">
      <h1 className="text-lg font-semibold">Access restricted</h1>
      <p>You need an admin or editor role to manage content.</p>
    </div>
  );
}

export default async function AdminPage() {
  const supabase = getSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/login?next=/admin`);
  }

  const role = await resolveRole(user);
  if (!role) {
    return (
      <main className="flex min-h-screen flex-col gap-12 bg-slate-950 px-6 py-16 text-white">
        <Unauthorized />
      </main>
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_TINA_API_URL;
  if (!apiUrl) {
    return (
      <main className="flex min-h-screen flex-col gap-12 bg-slate-950 px-6 py-16 text-white">
        <MissingConfig message="The Tina GraphQL endpoint URL is not configured." />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-2 py-8 text-white sm:px-6">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-xl ring-1 ring-black/40">
        <Suspense fallback={<Loading />}>
          <AdminClient apiUrl={apiUrl} />
        </Suspense>
      </div>
    </main>
  );
}
