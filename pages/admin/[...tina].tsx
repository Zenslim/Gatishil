// Next.js Pages Router entry for Tina Studio.
// Force server-side rendering so Next.js does not require getStaticPaths.
export { default } from 'tinacms/dist/next/studio';
export async function getServerSideProps() {
  return { props: {} };
}
