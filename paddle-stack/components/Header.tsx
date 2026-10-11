'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type HeaderProps = {
  backHref?: string
  backLabel?: string
  right?: React.ReactNode
}

export default function Header({ backHref, backLabel = 'Back', right }: HeaderProps) {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null | undefined>(undefined) // undefined = loading
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setUserEmail(data.session?.user.email ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function signOut() {
    setMenuOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  const defaultRight =
    userEmail === undefined ? null : userEmail ? (
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0f172a]"
        >
          <span className="flex h-2 w-2 rounded-full bg-[#d9f24a]" />
          {userEmail}
          <span className={`text-xs text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-[#0f172a] hover:bg-slate-50"
            >
              My sessions
            </Link>
            <a
              href="mailto:support@paddlestack.app?subject=Help"
              className="block px-4 py-2.5 text-sm text-[#0f172a] hover:bg-slate-50"
            >
              Help
            </a>
            <a
              href="mailto:support@paddlestack.app?subject=Feedback"
              className="block px-4 py-2.5 text-sm text-[#0f172a] hover:bg-slate-50"
            >
              Feedback
            </a>
            <div className="border-t border-slate-100" />
            <button
              onClick={signOut}
              className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    ) : (
      <Link href="/admin" className="text-sm font-medium text-[#0f2a3a] underline-offset-4 hover:underline">
        Organizer login
      </Link>
    )

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-[#0f172a]"
            >
              <span aria-hidden>←</span> {backLabel}
            </Link>
          )}
          <Link href="/" className="text-lg font-extrabold tracking-tight text-[#0f172a]">
            Paddle Stack
          </Link>
        </div>
        {right !== undefined ? right : defaultRight}
      </div>
    </header>
  )
}