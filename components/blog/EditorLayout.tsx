export function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0B0C10] text-slate-200">
      <header className="border-b border-white/10 bg-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-amber-300 font-semibold">✍️ Compose</h1>
          <span className="text-slate-400 text-sm">Auto-saves locally</span>
        </div>
      </header>
      {children}
    </main>
  );
}
