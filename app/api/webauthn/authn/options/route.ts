import { NextResponse } from 'next/server';
import { createRegOptions } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { userId, username } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    const opts = await createRegOptions(userId, username || userId);
    return NextResponse.json(opts);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create options' }, { status: 500 });
  }
}
