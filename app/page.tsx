import dynamic from 'next/dynamic';

const RebirthScene = dynamic(() => import('@/components/RebirthScene'), { ssr: false });
const HeroOverlay = dynamic(() => import('@/components/HeroOverlay'), { ssr: false });

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-black text-white overflow-x-clip">
      <section className="relative h-[100dvh] w-full">
        <RebirthScene />
        <HeroOverlay />
        <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.08] animated-bg" />
      </section>

      <footer className="relative z-20 py-10 text-sm text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <div className="flex flex-col items-center gap-2">
            <p className="text-center">© {new Date().getFullYear()} GatishilNepal.org</p>
            <p className="text-center text-slate-400">Your circle is waiting.</p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .animated-bg {
          background: linear-gradient(270deg, #fbbf24, #ec4899, #8b5cf6, #fbbf24);
          background-size: 600% 600%;
          animation: aurora 25s ease infinite;
        }
        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </main>
  );
}
