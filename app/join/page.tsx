
import dynamic from "next/dynamic";

const JoinClient = dynamic(() => import("./JoinClient"), {
  ssr: false,
  loading: () => null,
});

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="min-h-screen py-10">
      <JoinClient />
    </main>
  );
}
