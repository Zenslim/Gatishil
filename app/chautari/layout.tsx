import "@/styles/chautari.css";
import { AmbientLayer } from "./AmbientLayer";

export default function ChautariLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AmbientLayer>{children}</AmbientLayer>;
}
