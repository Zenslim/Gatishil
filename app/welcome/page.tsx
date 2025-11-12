"use client";
export const dynamic = "force-dynamic";

// Server wrapper for /welcome
import { Suspense } from "react";
import Client from "./Client";
import Card from "@/components/Card";
export const revalidate = false;

export default function Page() {
  return (
    <Suspense fallback={<Card title="🎉 Welcome"><div style={{opacity:.8}}>Loading…</div></Card>}>
      <Client />
    </Suspense>
  );
}
