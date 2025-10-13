// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env'

export async function GET() {
  return NextResponse.json({
    ok: true,
    supabaseUrl: !!NEXT_PUBLIC_SUPABASE_URL,
    anonKey: !!NEXT_PUBLIC_SUPABASE_ANON_KEY
  })
}
