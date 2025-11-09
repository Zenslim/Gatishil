// app/auth/callback/page.tsx
import Client from "./Client";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  // Server component: renders a tiny shell; the client does the token exchange.
  return (
    <main className="min-h-screen grid place-items-center px-6 py-10">
      <Client />
    </main>
  );
}
