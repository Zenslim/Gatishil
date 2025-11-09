// app/tax/calculator/page.tsx
import type { Metadata } from "next";
import Chrome from "./Chrome";

export const metadata: Metadata = {
  title: "True Tax Mirror — Calculator | Gatishil Nepal",
  description:
    "Compute your true effective tax rate by stacking hidden indirect taxes over visible taxes. Built for Nepal.",
  openGraph: {
    title: "True Tax Mirror — Calculator",
    description: "Estimate hidden indirect taxes and see your full effective tax rate.",
    type: "website",
    url: "https://www.gatishilnepal.org/tax/calculator",
  },
};

export default function Page() {
  return <Chrome />;
}
