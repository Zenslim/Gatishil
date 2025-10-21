// Inert middleware: disabled to stop redirect loops
import { NextResponse, type NextRequest } from 'next/server'

export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

// Match nothing real so this never runs
export const config = {
  matcher: ['/__noop__/:path*'],
}
