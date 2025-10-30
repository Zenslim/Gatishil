import HomePageClient from '@/components/home/HomePageClient';
import { client } from '@/tina/__generated__/client';

export const dynamic = 'force-static';
export const revalidate = false;

export default async function HomePage() {
  const tinaProps = await client.queries.pages({ relativePath: 'home.json' });

  return <HomePageClient {...tinaProps} />;
}
