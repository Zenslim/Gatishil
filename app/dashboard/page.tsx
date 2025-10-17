// app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = getSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login?next=/dashboard')
  }

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Welcome, {session.user.email}</h1>
      <p className="mt-2 opacity-80">This is your movement console.</p>
    </main>
  )
}
