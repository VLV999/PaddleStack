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
  name: string
  skill: string
  status: string
  queued_at: string
  court: number | null
  slot: number | null
}

export default function AdminSessionPage() {
  const { id } = useParams<{ id: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickSkill, setQuickSkill] = useState('intermediate')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSkill, setEditSkill] = useState('intermediate')

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      const { data: s } = await supabase
        .from('sessions')
        .select('id, code, name, court_count, is_open')
        .eq('id', id)
        .single()

      if (cancelled) return
      setSession(s)

      async function loadPlayers() {
        const { data } = await supabase
          .from('players')
          .select('id, name, skill, status, queued_at, court, slot')
          .eq('session_id', id)
          .order('queued_at', { ascending: true })
        if (!cancelled) setPlayers(data ?? [])
      }

      await loadPlayers()
      if (cancelled) return
      setLoading(false)

      channel = supabase
        .channel(`admin:${id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${id}` },
          () => loadPlayers()
        )
        .subscribe()
    }

    init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [id])

  async function assign(playerId: string, court: number, slot: number) {
    // If someone's already in that slot, send them back to the queue.
    const occupant = players.find((p) => p.status === 'playing' && p.court === court && p.slot === slot)
    if (occupant) {
      await supabase
        .from('players')
        .update({ status: 'queued', court: null, slot: null, queued_at: new Date().toISOString() })
        .eq('id', occupant.id)
    }

    await supabase
      .from('players')
      .update({ status: 'playing', court, slot })
      .eq('id', playerId)

    setSelected(null)
  }

  async function finishGame(court: number) {
    const onCourt = players.filter((p) => p.status === 'playing' && p.court === court)
    if (onCourt.length === 0) return

    const ids = onCourt.map((p) => p.id)

    await supabase.from('matches').insert({
      session_id: id,
      court,
      player_ids: ids,
    })

    const { error } = await supabase
      .from('players')
      .update({ status: 'queued', court: null, slot: null, queued_at: new Date().toISOString() })
      .in('id', ids)

    if (error) console.log('Finish game error:', error)
  }

  async function setCourtCount(next: number) {
    if (!session) return
    const clamped = Math.max(1, Math.min(12, next))
    if (clamped < session.court_count) {
      // Don't remove a court that still has people on it.
      const stillPlaying = players.some((p) => p.status === 'playing' && (p.court ?? 0) >= clamped)
      if (stillPlaying) return
    }
    const { data } = await supabase
      .from('sessions')
      .update({ court_count: clamped })
      .eq('id', session.id)
      .select()
      .single()
    if (data) setSession(data)
  }

  async function toggleOpen() {
    if (!session) return
    const { data } = await supabase
      .from('sessions')
      .update({ is_open: !session.is_open })
      .eq('id', session.id)
      .select()
      .single()
    if (data) setSession(data)
  }

  function copyLink() {
    if (!session) return
    navigator.clipboard.writeText(`${window.location.origin}/join/${session.code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function quickAdd(e: React.FormEvent) {
    e.preventDefault()
    const clean = quickName.trim()
    if (!clean || !session) return

    const { error } = await supabase.from('players').insert({
      session_id: session.id,
      user_id: null,
      name: clean,
      skill: quickSkill,
    })

    if (error) {
      alert(error.code === '23505' ? `"${clean}" is already in this session.` : error.message)
      return
    }

    setQuickName('')
  }

  async function removePlayer(playerId: string, name: string) {
    if (!confirm(`Remove ${name} from the session?`)) return
    await supabase.from('players').delete().eq('id', playerId)
  }

  function startEdit(p: Player) {
    setEditingId(p.id)
    setEditName(p.name)
    setEditSkill(p.skill)
  }

  async function saveEdit(playerId: string) {
    const clean = editName.trim()
    if (!clean) return

    const duplicate = players.some(
      (p) => p.id !== playerId && p.name.toLowerCase() === clean.toLowerCase()
    )
    if (duplicate) {
      alert(`"${clean}" is already taken in this session.`)
      return
    }

    const { error } = await supabase
      .from('players')
      .update({ name: clean, skill: editSkill })
      .eq('id', playerId)

    if (error) {
      alert(error.code === '23505' ? `"${clean}" is already taken in this session.` : error.message)
      return
    }

    setEditingId(null)
  }

  async function autoAssignAll() {
    if (!session) return

    const skillValue = (s: string) => (s === 'beginner' ? 0 : s === 'advanced' ? 2 : 1)
    const WINDOW = 8 // how far into the queue we're willing to look, per court

    // Pull match history so we can penalize repeat groupings.
    const { data: matchRows } = await supabase
      .from('matches')
      .select('player_ids')
      .eq('session_id', id)

    const playedTogether = new Set<string>()
    ;(matchRows ?? []).forEach((m) => {
      const ids = m.player_ids as string[]
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          playedTogether.add([ids[i], ids[j]].sort().join('|'))
        }
      }
    })

    function repeatCount(group: Player[]) {
      let count = 0
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (playedTogether.has([group[i].id, group[j].id].sort().join('|'))) count++
        }
      }
      return count
    }

    function scoreGroup(group: Player[], waitIndices: number[]) {
      const skills = group.map((p) => skillValue(p.skill))
      const spread = Math.max(...skills) - Math.min(...skills)
      const waitPenalty = waitIndices.reduce((a, b) => a + b, 0)
      return repeatCount(group) * 1000 + spread * 10 + waitPenalty * 0.1
    }

    // Work on a local copy of the queue so courts fill in order without
    // fighting over the same players before Realtime catches up.
    let workingQueue = players
      .filter((p) => p.status === 'queued')
      .sort((a, b) => a.queued_at.localeCompare(b.queued_at))

    const assignments: { court: number; group: Player[] }[] = []

    for (let c = 0; c < session.court_count; c++) {
      const isEmpty = players.every((p) => !(p.status === 'playing' && p.court === c))
      if (!isEmpty || workingQueue.length < 4) continue

      const pool = workingQueue.slice(0, WINDOW)
      let best: { group: Player[]; indices: number[]; score: number } | null = null

      for (let a = 0; a < pool.length; a++) {
        for (let b = a + 1; b < pool.length; b++) {
          for (let c2 = b + 1; c2 < pool.length; c2++) {
            for (let d = c2 + 1; d < pool.length; d++) {
              const group = [pool[a], pool[b], pool[c2], pool[d]]
              const score = scoreGroup(group, [a, b, c2, d])
              if (!best || score < best.score) best = { group, indices: [a, b, c2, d], score }
            }
          }
        }
      }

      if (!best) continue

      assignments.push({ court: c, group: best.group })
      const chosenIds = new Set(best.group.map((p) => p.id))
      workingQueue = workingQueue.filter((p) => !chosenIds.has(p.id))
    }

    for (const { court, group } of assignments) {
      // Sort by skill and interleave, so each side of the net gets one
      // stronger and one weaker player rather than stacking skill on one side.
      const sorted = [...group].sort((a, b) => skillValue(a.skill) - skillValue(b.skill))
      const bySlot = [sorted[0], sorted[2], sorted[1], sorted[3]]
      await Promise.all(
        bySlot.map((p, slot) =>
          supabase.from('players').update({ status: 'playing', court, slot }).eq('id', p.id)
        )
      )
    }
  }

  if (loading) return <main className="grid min-h-dvh place-items-center bg-[#f8fafc] text-slate-500">Loading…</main>
  if (!session) return <main className="grid min-h-dvh place-items-center bg-[#f8fafc] text-slate-600">Session not found.</main>

  const queue = players.filter((p) => p.status === 'queued')
  const onCourtCount = players.filter((p) => p.status === 'playing').length

  return (
    <main className="min-h-dvh bg-[#f8fafc] pb-20">
      <Header backHref="/admin" backLabel="New session" right={null} />

      <header className="bg-[#0f2a3a] text-white">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">{session.name}</h1>
              <span className="flex items-center gap-1.5 text-xs text-white/50">
                <span className={`h-2 w-2 rounded-full ${session.is_open ? 'animate-pulse bg-[#d9f24a]' : 'bg-white/30'}`} />
                {session.is_open ? 'Open' : 'Closed'}
              </span>
            </div>
            <button
              onClick={toggleOpen}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                session.is_open
                  ? 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20'
                  : 'bg-[#d9f24a] text-[#0f2a3a] hover:brightness-95'
              }`}
            >
              {session.is_open ? 'End session' : 'Reopen session'}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium ring-1 ring-white/20 hover:bg-white/20"
            >
              <span className="tracking-[0.15em]">{session.code}</span>
              <span className="text-white/40">·</span>
              <span>{copied ? 'Copied!' : 'Copy join link'}</span>
            </button>

            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-2 ring-1 ring-white/20">
              <button
                onClick={() => setCourtCount(session.court_count - 1)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Fewer courts"
              >
                −
              </button>
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: session.court_count }, (_, c) => {
                  const filled = players.filter((p) => p.status === 'playing' && p.court === c).length
                  return (
                    <span
                      key={c}
                      title={`Court ${c + 1}`}
                      className={`h-4 w-3 rounded-sm ${
                        filled === 4 ? 'bg-[#d9f24a]' : filled > 0 ? 'bg-white/50' : 'bg-white/15'
                      }`}
                    />
                  )
                })}
                <span className="ml-1.5 text-xs text-white/50">{session.court_count} courts</span>
              </div>
              <button
                onClick={() => setCourtCount(session.court_count + 1)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="More courts"
              >
                +
              </button>
            </div>

            <button
              onClick={autoAssignAll}
              disabled={queue.length < 4}
              className="rounded-lg bg-[#d9f24a] px-3 py-2 text-sm font-semibold text-[#0f2a3a] disabled:cursor-not-allowed disabled:opacity-30"
            >
              Auto-assign
            </button>

            <span className="ml-auto text-xs text-white/50">
              {onCourtCount} playing · {queue.length} waiting
            </span>
          </div>
        </div>
      </header>

      {players.length === 0 ? (
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <p className="text-lg text-slate-500">Nobody's joined yet.</p>
          <p className="mt-2 text-sm text-slate-400">
            Share the code <span className="font-semibold text-[#0f172a]">{session.code}</span> to get started.
          </p>
          <form onSubmit={quickAdd} className="mx-auto mt-6 flex max-w-xs gap-2">
            <input
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="Or add a player"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#2f6f8f] focus:ring-2 focus:ring-[#2f6f8f]/30"
            />
            <button type="submit" className="rounded-lg bg-[#0f2a3a] px-3 py-2 text-sm font-semibold text-white">
              Add
            </button>
          </form>
        </div>
      ) : (
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-10 md:grid-cols-[1fr_320px]">
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Courts</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: session.court_count }, (_, c) => {
                const onCourt = players
                  .filter((p) => p.status === 'playing' && p.court === c)
                  .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
                const filled = onCourt.length
                const label = filled === 0 ? 'Open' : filled === 4 ? 'In play' : `${filled}/4`

                return (
                  <div key={c} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-[#0f172a]">Court {c + 1}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          filled === 4
                            ? 'bg-[#d9f24a] text-[#0f2a3a]'
                            : filled === 0
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#2f6f8f] p-3">
                      {[0, 1].map((side) => (
                        <div
                          key={side}
                          className={`space-y-2 ${side === 0 ? 'border-r border-dashed border-white/30 pr-3' : ''}`}
                        >
                          {[side * 2, side * 2 + 1].map((slot) => {
                            const p = onCourt.find((pl) => pl.slot === slot)
                            return (
                              <div
                                key={slot}
                                onClick={() => selected && assign(selected, c, slot)}
                                className={`rounded-lg border border-dashed px-2 py-2 text-center text-xs transition-colors ${
                                  selected
                                    ? 'cursor-pointer border-[#d9f24a] bg-white/10 hover:bg-white/20'
                                    : 'border-white/30 bg-white/5'
                                }`}
                              >
                                {p ? (
                                  <span className="font-medium text-white">{p.name}</span>
                                ) : (
                                  <span className="text-white/50">Open</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => finishGame(c)}
                      disabled={filled === 0}
                      className="mt-3 w-full rounded-xl bg-[#0f2a3a] py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Finish game
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          <aside>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Queue</h2>
              <span className="rounded-full bg-[#0f2a3a] px-2.5 py-0.5 text-xs font-semibold text-white">
                {queue.length}
              </span>
            </div>

            <form onSubmit={quickAdd} className="mb-4 flex gap-2">
              <input
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="Add a player"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#2f6f8f] focus:ring-2 focus:ring-[#2f6f8f]/30"
              />
              <select
                value={quickSkill}
                onChange={(e) => setQuickSkill(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-[#2f6f8f]"
              >
                <option value="beginner">Beg</option>
                <option value="intermediate">Int</option>
                <option value="advanced">Adv</option>
              </select>
              <button type="submit" className="rounded-lg bg-[#0f2a3a] px-3 py-2 text-sm font-semibold text-white">
                Add
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              {selected && (
                <p className="mb-2 px-1 text-xs text-slate-500">Tap an open court slot to place this player.</p>
              )}
              {queue.length === 0 ? (
                <p className="px-1 py-2 text-sm text-slate-400">Nobody waiting.</p>
              ) : (
                <ol className="space-y-1">
                  {queue.map((p, i) =>
                    editingId === p.id ? (
                      <li key={p.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-[#2f6f8f]"
                          autoFocus
                        />
                        <select
                          value={editSkill}
                          onChange={(e) => setEditSkill(e.target.value)}
                          className="rounded-md border border-slate-300 px-1 py-1 text-sm outline-none focus:border-[#2f6f8f]"
                        >
                          <option value="beginner">Beg</option>
                          <option value="intermediate">Int</option>
                          <option value="advanced">Adv</option>
                        </select>
                        <button
                          onClick={() => saveEdit(p.id)}
                          className="rounded-md bg-[#0f2a3a] px-2 py-1 text-xs font-semibold text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </li>
                    ) : (
                      <li
                        key={p.id}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                          selected === p.id ? 'bg-[#d9f24a] font-semibold text-[#0f2a3a]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span
                          onClick={() => setSelected(selected === p.id ? null : p.id)}
                          className={`flex h-5 w-5 flex-none cursor-pointer items-center justify-center rounded-full text-[10px] ${
                            selected === p.id ? 'bg-[#0f2a3a] text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span
                          onClick={() => setSelected(selected === p.id ? null : p.id)}
                          className="flex-1 cursor-pointer truncate"
                        >
                          {p.name}
                        </span>
                        <span className={selected === p.id ? 'text-[#0f2a3a]/70' : 'text-slate-400'}>{p.skill}</span>
                        <button
                          onClick={() => startEdit(p)}
                          className="text-xs text-slate-400 opacity-0 hover:text-slate-600 group-hover:opacity-100"
                          aria-label={`Edit ${p.name}`}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => removePlayer(p.id, p.name)}
                          className="text-xs text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
                          aria-label={`Remove ${p.name}`}
                        >
                          ✕
                        </button>
                      </li>
                    )
                  )}
                </ol>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}