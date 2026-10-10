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
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [name, setName] = useState('')
  const [courts, setCourts] = useState(4)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  // Email/password auth form state
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: cur } = await supabase.auth.getSession()
      const uid = cur.session?.user.id ?? null
      if (cancelled) return
      setUserId(uid)

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

  async function submitEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthBusy(true)
    setAuthError(null)
    setAuthMessage(null)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setAuthError(error.message)
      } else if (!data.session) {
        setAuthMessage('Check your email to confirm your account, then sign in.')
        setTimeout(() => setAuthMessage(null), 6000)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError(error.message)
    }

    setAuthBusy(false)
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

  if (userId === undefined) {
    return <main className="grid min-h-dvh place-items-center bg-[#f8fafc] text-slate-500">Loading…</main>
  }

  if (!userId) {
    return (
      <main className="min-h-dvh bg-[#f8fafc]">
        <Header backHref="/" backLabel="Home" right={null} />
        <div className="mx-auto max-w-sm px-6 py-20">
          <h1 className="text-center text-2xl font-extrabold tracking-tight text-[#0f172a]">Organizer sign-in</h1>
          <p className="mt-2 text-center text-sm text-slate-500">
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

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => { setMode('signin'); setAuthError(null); setAuthMessage(null) }}
              className={`flex-1 rounded-md py-1.5 ${mode === 'signin' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-500'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setAuthError(null); setAuthMessage(null) }}
              className={`flex-1 rounded-md py-1.5 ${mode === 'signup' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-500'}`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={submitEmailAuth} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2f6f8f] focus:ring-2 focus:ring-[#2f6f8f]/30"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2f6f8f] focus:ring-2 focus:ring-[#2f6f8f]/30"
            />
            <button
              disabled={authBusy}
              type="submit"
              className="w-full rounded-xl bg-[#0f2a3a] py-3 font-semibold text-white disabled:opacity-60"
            >
              {authBusy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {authError && <p className="mt-3 text-sm text-red-600">{authError}</p>}
        </div>

        {authMessage && (
          <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-[#0f2a3a] px-4 py-3 text-sm font-medium text-white shadow-lg">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#d9f24a] text-xs font-bold text-[#0f2a3a]">
                ✓
              </span>
              {authMessage}
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
            <button
              key={s.id}
              onClick={() => router.push(`/admin/${s.id}`)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-[#2f6f8f]"
            >
              <div>
                <p className="font-semibold text-[#0f172a]">{s.name}</p>
                <p className="text-xs text-slate-400">{s.code}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.is_open ? 'bg-[#d9f24a] text-[#0f2a3a]' : 'bg-slate-100 text-slate-400'}`}>
                {s.is_open ? 'Open' : 'Closed'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}