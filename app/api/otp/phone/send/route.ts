import { handleSend } from "@/lib/otp";
export async function POST(req: Request) { return handleSend(req); }
