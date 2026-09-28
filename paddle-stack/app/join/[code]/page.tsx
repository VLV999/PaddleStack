'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'

type Session = {
  id: string
  code: string
  name: string
  court_count: number
  is_open: boolean
}

type Player = {
  id: string
  user_id: string
  name: string
  skill: string
  status: string
  queued_at: string
  court: number | null
  slot: number | null
}

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const [userId, setUserId] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [name, setName] = useState('')
  const [skill, setSkill] = useState('intermediate')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      // Sign in as a guest if we're not already.
      const { data: cur } = await supabase.auth.getSession()
      let uid = cur.session?.user.id
      if (!uid) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error || !data.user) {
          setError('Could not connect. Reload and try again.')
          setLoading(false)
          return
        }
        uid = data.user.id
      }
      if (cancelled) return
      setUserId(uid)

      const { data: s } = await supabase
        .from('sessions')
        .select('id, code, name, court_count, is_open')
        .eq('code', code.toUpperCase())
        .single()

      if (cancelled) return
      if (!s) {
        setError('No session found with that code.')
        setLoading(false)
        return
      }
      setSession(s)

      async function loadPlayers() {
        const { data } = await supabase
          .from('players')
          .select('id, user_id, name, skill, status, queued_at, court, slot')
          .eq('session_id', s!.id)
          .order('queued_at', { ascending: true })
        if (!cancelled) setPlayers(data ?? [])
      }

      await loadPlayers()
      if (cancelled) return
      setLoading(false)

      channel = supabase
        .channel(`join:${s.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${s.id}` },
          () => loadPlayers()
        )
        .subscribe()
    }

    init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [code])

  async function join(e: React.FormEvent) {
    e.preventDefault()
    if (!session || !userId) return
    setBusy(true)
    setError(null)

    const { error: insertError } = await supabase.from('players').insert({
      session_id: session.id,
      user_id: userId,
      name: name.trim(),
      skill,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        setError(`"${name.trim()}" is already taken in this session. Try adding a last initial.`)
      } else {
        setError(insertError.message)
      }
      setBusy(false)
      return
    }

    setBusy(false)
  }

  if (loading) return <main className="grid min-h-dvh place-items-center bg-[#f8fafc] text-slate-500">Loading…</main>
  if (error && !session) return <main className="grid min-h-dvh place-items-center bg-[#f8fafc] px-6 text-center text-slate-600">{error}</main>
  if (!session) return <main className="grid min-h-dvh place-items-center bg-[#f8fafc] text-slate-600">Session not found.</main>

  const me = players.find((p) => p.user_id === userId)

  if (!me && !session.is_open) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f8fafc] px-6 text-center">
        <p className="text-lg text-slate-600">This session is closed.</p>
        <p className="mt-1 text-sm text-slate-400">Check with the organizer if you think this is a mistake.</p>
      </main>
    )
  }

  const queue = players.filter((p) => p.status === 'queued')
  const position = me?.status === 'queued' ? queue.findIndex((p) => p.id === me.id) + 1 : null

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-[#f8fafc] pb-16">
      <Header right={null} />

      <header className="px-5 pb-3 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0f172a]">{session.name}</h1>
      </header>

      {!me ? (
        <section className="mx-5 rounded-2xl bg-[#0f2a3a] p-6 text-white">
          <form onSubmit={join} className="space-y-3">
            <label htmlFor="name" className="block text-lg font-semibold">
              Join this session
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border-0 bg-white/10 px-4 py-3 text-white placeholder-white/50 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-[#d9f24a]"
            />
            <select
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="w-full rounded-xl border-0 bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-[#d9f24a]"
            >
              <option className="text-slate-900" value="beginner">Beginner</option>
              <option className="text-slate-900" value="intermediate">Intermediate</option>
              <option className="text-slate-900" value="advanced">Advanced</option>
            </select>
            <button
              disabled={busy}
              className="w-full rounded-xl bg-[#d9f24a] py-3 font-semibold text-[#0f2a3a] disabled:opacity-60"
            >
              {busy ? 'Joining…' : 'Join session'}
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-[#ffb4a2]">{error}</p>}
        </section>
      ) : (
        <section className="mx-5 rounded-2xl bg-[#0f2a3a] p-6 text-white">
          <p className="text-sm text-white/70">{me.name}</p>
          {me.status === 'queued' && (
            <p className="text-2xl font-bold">
              You're <span className="text-[#d9f24a]">#{position}</span> in the queue
            </p>
          )}
          {me.status === 'playing' && (
            <p className="text-2xl font-bold">
              On <span className="text-[#d9f24a]">Court {(me.court ?? 0) + 1}</span>
            </p>
          )}
        </section>
      )}

      <section className="mt-6 px-5">
        <h2 className="mb-2 font-semibold text-[#0f172a]">Courts</h2>
        <ul className="space-y-2">
          {Array.from({ length: session.court_count }, (_, c) => {
            const onCourt = players.filter((p) => p.status === 'playing' && p.court === c)
            return (
              <li key={c} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-1 text-sm font-medium text-slate-500">Court {c + 1}</div>
                <p className={onCourt.length ? 'text-[#0f172a]' : 'text-slate-400'}>
                  {onCourt.length ? onCourt.map((p) => p.name).join(', ') : 'Open'}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-2 font-semibold text-[#0f172a]">Queue ({queue.length})</h2>
        {queue.length === 0 ? (
          <p className="text-slate-400">Nobody waiting.</p>
        ) : (
          <ol className="space-y-1.5">
            {queue.map((p, i) => (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                  p.id === me?.id ? 'bg-[#d9f24a]/60 font-semibold' : 'bg-white'
                }`}
              >
                <span className="w-5 text-sm text-slate-500">{i + 1}</span>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-slate-400">{p.skill}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}