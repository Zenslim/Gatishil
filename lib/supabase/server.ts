import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/supabase";

type ServerContext = {
  request?: NextRequest;
  response?: NextResponse;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseServer(context?: ServerContext) {
  if (context?.request && context?.response) {
    const { request, response } = context;
    return createServerClient<Database>(url, anon, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          response.cookies.set({ name, value, ...(options ?? {}) });
        },
        remove(name: string, options) {
          response.cookies.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
        },
      },
    });
  }

  return createServerClient<Database>(url, anon, {
    cookies: nextCookies,
  });
}

export default getSupabaseServer;
