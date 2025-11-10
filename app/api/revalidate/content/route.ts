import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

const TOKEN_HEADER = "x-revalidate-token";

export async function POST(request: Request) {
  const token = request.headers.get(TOKEN_HEADER);
  const secret = process.env.REVALIDATE_TOKEN;
  if (secret && token !== secret) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  revalidateTag("content");
  return NextResponse.json({ ok: true, revalidated: true });
}
