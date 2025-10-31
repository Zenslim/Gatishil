import tinaConfig from "@/tina/config";
import { TinaAdmin } from "tinacms/dist/studio";
export { getStaticProps } from "tinacms/dist/studio";

export default function TinaAdminPage() {
  return <TinaAdmin config={tinaConfig} />;
}
