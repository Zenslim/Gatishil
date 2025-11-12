// app/admin/page.tsx
"use client";
export const dynamic = "force-dynamic";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const AdminClient = dynamic(() => import("./AdminClient"), { ssr: false });

export default function AdminPage() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifyRole = async () => {
      // 1️⃣ Get logged-in user
      const { data: userData, error } = await supabase.auth.getUser();
      if (error || !userData?.user) {
        router.push("/login?next=/admin");
        return;
      }

      // 2️⃣ Fetch role from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      const role = profile?.role;

      // 3️⃣ Gate access
      if (role === "admin" || role === "editor") {
        setAllowed(true);
      } else {
        router.push("/dashboard"); // or show friendly denial
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
