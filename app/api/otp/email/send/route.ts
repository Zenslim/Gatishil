// Delegates to working lib/otp.ts: handleSend (supports email or phone payload)
import { handleSend } from '@/lib/otp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    return await handleSend(req)
  } catch (e: any) {
    console.error('otp/send route error:', e?.message || e)
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
