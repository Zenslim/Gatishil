// app/admin/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

const AdminClient = dynamic(() => import("./AdminClient"), { ssr: false });

export default function AdminPage() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const verifyRole = async () => {
      const { data } = await supabase.auth.getUser();
      const role =
        data?.user?.user_metadata?.role ||
        data?.user?.app_metadata?.role ||
        "member";
      if (role === "admin" || role === "editor") {
        setAllowed(true);
      } else {
        router.push("/login?next=/admin");
      }
      setLoading(false);
    };
    verifyRole();
  }, []);

  if (loading)
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-400">
        Loading Tina Studio…
      </main>
    );

  if (!allowed)
    return (
      <main className="min-h-screen flex items-center justify-center text-red-500">
        Access denied.
      </main>
    );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-xl ring-1 ring-black/40">
        <AdminClient />
      </div>
    </main>
  );
}
