// Tina Studio route — SSR to avoid getStaticPaths on dynamic catch-all.
import { TinaAdmin } from 'tinacms/dist/studio';
export default TinaAdmin;
export async function getServerSideProps() {
  return { props: {} };
}
