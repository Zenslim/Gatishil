// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 text-white">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded bg-white/10" />
        <div className="h-4 w-2/3 rounded bg-white/10" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="h-40 rounded bg-white/10 md:col-span-2" />
          <div className="h-40 rounded bg-white/10" />
        </div>
      </div>
    </div>
  );
}
