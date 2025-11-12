"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { sealAndPublish } from "@/lib/blogApi";
import { EditorLayout } from "@/components/blog/EditorLayout";

// 🧩 Temporary inline Editor component (until real editor is added)
function Editor({ user, onPublish }: { user: any; onPublish: (data: any) => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-gray-300 py-12">
      <h1 className="text-xl font-semibold mb-4">✍️ Blog Editor</h1>
      <p className="text-sm mb-8 opacity-80">
        Logged in as <strong>{user?.email || "unknown user"}</strong>
      </p>
      <textarea
        placeholder="Write your post here..."
        className="w-full max-w-2xl h-40 p-4 bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        onClick={() => onPublish?.({ title: "Untitled Draft", body: "Sample content" })}
        className="mt-6 rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-all"
      >
        Publish Draft
      </button>
    </div>
  );
}

export default function BlogEditorPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
    };
    fetchUser();
  }, [router]);

  if (!user)
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-gray-400">
        Loading editor…
      </main>
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-8">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl ring-1 ring-black/40">
        <EditorLayout>
          <Editor user={user} onPublish={sealAndPublish} />
        </EditorLayout>
      </div>
    </main>
  );
}
