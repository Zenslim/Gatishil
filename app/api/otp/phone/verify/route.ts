// app/api/otp/phone/verify/route.ts
import { handleVerify } from '@/lib/otp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  return handleVerify(req)
}
