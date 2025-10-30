// Server-safe Manifesto page to fix build error: "createContext is not a function".
// No React context or client-only libraries are used here.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manifesto • Gatishil Nepal',
  description: 'Economics + Culture First → Politics Later. The living manifesto of Gatishil Nepal.',
};

export default function ManifestoPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-10 prose prose-invert">
      <h1>Gatishil Nepal — Manifesto</h1>
      <p>
        This is a temporary, server-safe version to restore builds while we wire inline editing.
        The full manifesto content (EN/NP) will load from Tina content soon.
      </p>
      <h2>Core Thesis</h2>
      <p>
        Economics and culture must be strengthened first; politics follows. We focus on productive work,
        cooperative value-creation, and cultural revival that empowers every ward.
      </p>
      <p className="opacity-70 text-sm">
        Build fix: removed client-only/context usage that caused <code>createContext</code> to be undefined during SSR.
      </p>
    </main>
  );
}
