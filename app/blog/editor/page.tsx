"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import nextDynamic from "next/dynamic"; // ✅ renamed import
import { supabase } from "@/lib/supabase/client";
import { sealAndPublish } from "@/lib/blogApi";
import { EditorLayout } from "@/components/blog/EditorLayout";

const Editor = nextDynamic(() => import("@/components/blog/Editor"), {
  ssr: false,
});

export default function BlogEditorPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) router.push("/login");
      else setUser(data.user);
    };
    fetchUser();
  }, [router]);

  if (!user)
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-400">
        Loading editor…
      </main>
    );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-xl ring-1 ring-black/40">
        <EditorLayout>
          <Editor user={user} onPublish={sealAndPublish} />
        </EditorLayout>
      </div>
    </main>
  );
}
