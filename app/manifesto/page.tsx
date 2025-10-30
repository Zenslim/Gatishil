// app/manifesto/page.tsx
export const dynamic = 'force-static';

export default function ManifestoPage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center text-center px-6">
      <div>
        <h1 className="text-3xl font-bold mb-3">Manifesto is moving to MDX</h1>
        <p className="opacity-80">
          The long-form manifesto is being migrated to an MDX book layout with bilingual blocks.
          For now, this placeholder prevents 404s. Please check back soon.
        </p>
      </div>
    </main>
  );
}
