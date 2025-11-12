'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function Navbar() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthed(!!data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session)
    })
    return () => { sub.subscription.unsubscribe(); active = false }
  }, [])

  return (
    <nav className="w-full border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 text-white">
        <Link href="/" className="font-semibold">Gatishil Nepal</Link>
        <div className="ml-auto flex items-center gap-3">
          {!authed && <Link href="/join" className="hover:underline">Join</Link>}
          {authed ? (
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          ) : (
            <Link href="/login" className="hover:underline">Login</Link>
          )}
        </div>
      </div>
    </nav>
  )
}
