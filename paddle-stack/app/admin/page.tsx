'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

type SessionRow = {
  id: string
  code: string
  name: string
  is_open: boolean
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null | undefined>(undefined) // undefined = loading
  const [isGuest, setIsGuest] = useState(false)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [name, setName] = useState('')
  const [courts, setCourts] = useState(4)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [showGuestWarning, setShowGuestWarning] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: cur } = await supabase.auth.getSession()
      const uid = cur.session?.user.id ?? null
      if (cancelled) return
      setUserId(uid)
      setIsGuest(cur.session?.user.is_anonymous ?? false)

      if (uid) {
        const { data } = await supabase
          .from('sessions')
          .select('id, code, name, is_open, created_at')
          .eq('owner_id', uid)
          .order('created_at', { ascending: false })
        if (!cancelled) setSessions(data ?? [])
      }
    }

    load()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
      setIsGuest(session?.user.is_anonymous ?? false)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function continueAsGuest() {
    setShowGuestWarning(false)
    await supabase.auth.signInAnonymously()
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSessions([])
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setBusy(true)
    setError(null)

    const { data: session, error: insertError } = await supabase
      .from('sessions')
      .insert({ code: randomCode(), name: name.trim() || 'Open Play', owner_id: userId, court_count: courts })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setBusy(false)
      return
    }

    router.push(`/admin/${session.id}`)
  }

  async function deleteSession(sessionId: string, sessionName: string) {
    if (!confirm(`Delete "${sessionName}"? This removes it and all its players and match history permanently.`)) return
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
    if (error) {
      alert(error.message)
      return
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }

  if (userId === undefined) {
    return <main className="grid min-h-dvh place-items-center bg-[#f8fafc] text-slate-500">Loading…</main>
  }

  if (!userId) {
    return (
      <main className="min-h-dvh bg-[#f8fafc]">
        <Header backHref="/" backLabel="Home" right={null} />
        <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-24 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0f172a]">Organizer sign-in</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to create sessions and always be able to get back to them.
          </p>
          <button
            onClick={signInWithGoogle}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-[#0f172a] hover:bg-slate-50"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.6 5.6C40.8 36.3 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z"/>
            </svg>
            Sign in with Google
          </button>

          <button
            onClick={() => setShowGuestWarning(true)}
            className="mt-3 text-sm font-medium text-slate-400 underline-offset-4 hover:text-slate-600 hover:underline"
          >
            Continue as guest
          </button>
        </div>

        {showGuestWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-bold text-[#0f172a]">Continuing as a guest</h2>
              <p className="mt-2 text-sm text-slate-600">
                Guest sessions aren&apos;t saved to an account. If you close this tab or clear your browser data,
                any sessions you create will no longer be accessible — to you or your players. There&apos;s no way
                to recover them afterward.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                If you want to be able to get back to your sessions later, sign in with Google instead.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setShowGuestWarning(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={continueAsGuest}
                  className="flex-1 rounded-xl bg-[#0f2a3a] py-2.5 text-sm font-semibold text-white hover:bg-[#0c2230]"
                >
                  Continue as guest
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-[#f8fafc]">
      <Header backHref="/" backLabel="Home" right={
        <button onClick={signOut} className="text-sm font-medium text-slate-500 hover:text-[#0f172a]">
          Sign out
        </button>
      } />

      <div className="mx-auto max-w-xl px-6 py-12">
        {isGuest && (
          <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            You&apos;re signed in as a guest. Sessions you create here won&apos;t be saved once you leave — sign in
            with Google if you want to keep access to them.
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0f172a]">Your sessions</h1>
          <button
            onClick={() => setShowNewForm((v) => !v)}
            className="rounded-lg bg-[#0f2a3a] px-3 py-1.5 text-sm font-semibold text-white"
          >
            {showNewForm ? 'Cancel' : 'New session'}
          </button>
        </div>

        {showNewForm && (
          <form onSubmit={createSession} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Session name (e.g. Tuesday Open Play)"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2f6f8f] focus:ring-2 focus:ring-[#2f6f8f]/30"
            />
            <div className="flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-2">
              <span className="text-sm text-slate-600">Courts</span>
              <button type="button" onClick={() => setCourts((c) => Math.max(1, c - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">−</button>
              <span className="flex-1 text-center font-semibold text-[#0f172a]">{courts}</span>
              <button type="button" onClick={() => setCourts((c) => Math.min(12, c + 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">+</button>
            </div>
            <button
              disabled={busy}
              type="submit"
              className="w-full rounded-xl bg-[#0f2a3a] py-3 font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Creating…' : 'Create session'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        <div className="mt-6 space-y-2">
          {sessions.length === 0 && !showNewForm && (
            <p className="text-sm text-slate-400">No sessions yet — create your first one above.</p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-[#2f6f8f]"
            >
              <button onClick={() => router.push(`/admin/${s.id}`)} className="flex-1 text-left">
                <p className="font-semibold text-[#0f172a]">{s.name}</p>
                <p className="text-xs text-slate-400">{s.code}</p>
              </button>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.is_open ? 'bg-[#d9f24a] text-[#0f2a3a]' : 'bg-slate-100 text-slate-400'}`}>
                  {s.is_open ? 'Open' : 'Closed'}
                </span>
                <button
                  onClick={() => deleteSession(s.id, s.name)}
                  className="text-slate-300 opacity-0 hover:text-red-600 group-hover:opacity-100"
                  aria-label={`Delete ${s.name}`}
                  title="Delete session"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}