import { Suspense } from "react";
import Client from "./Client";

// Prevent prerender/export issues on OAuth/email callbacks
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Client />
    </Suspense>
  );
}
