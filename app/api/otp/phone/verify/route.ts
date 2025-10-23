import { handleVerify } from "@/lib/otp";
export async function POST(req: Request) { return handleVerify(req); }
