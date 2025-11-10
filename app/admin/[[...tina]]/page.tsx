import { Suspense } from "react";
import { redirect } from "next/navigation";

import { TinaAdmin } from "tinacms/dist/admin";

export const dynamic = "force-static";
export const revalidate = false;

const API_URL = process.env.NEXT_PUBLIC_TINA_API_URL;

export default function AdminPage() {
  if (!API_URL) {
    redirect("/" );
  }

  return (
    <main className="min-h-screen bg-[#0B0C10] text-slate-200">
      <Suspense fallback={<p className="p-6 text-slate-400">Loading studio…</p>}>
        <TinaAdmin
          config={{
            tinaGraphqlUrlOverride: API_URL,
          }}
          loading={<p className="p-6 text-slate-400">Booting Tina…</p>}
        />
      </Suspense>
    </main>
  );
}
