"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getValidatedNext } from "@/lib/auth/next";
import { createBrowserClient } from "@/lib/supabase/client";

export default function AuthCallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createBrowserClient();
  const [status, setStatus] = React.useState("Finalizing sign-in…");

  React.useEffect(() => {
    (async () => {
      try {
        const code = params.get("code");
        const next = getValidatedNext(window.location.href, "/dashboard");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        setStatus("Done. Redirecting…");
        router.replace(next);
      } catch (e:any) {
        setStatus(e?.message || "Sign-in failed. Try again.");
      }
    })();
  }, [router, params, supabase]);

  return <p className="p-6 text-sm text-gray-600">{status}</p>;
}
