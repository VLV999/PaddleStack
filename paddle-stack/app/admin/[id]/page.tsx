'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import SessionHeader from '@/components/SessionHeader'
import CourtGrid from '@/components/CourtGrid'
import QueuePanel from '@/components/QueuePanel'
import type { Session, Player } from '@/lib/types'
import { buildQueueItems, computeAutoAssignments, computeWinStats } from '@/lib/matchmaking'

export default function AdminSessionPage() {
  const { id } = useParams<{ id: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickSkill, setQuickSkill] = useState('intermediate')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSkill, setEditSkill] = useState('intermediate')
  const [groupMode, setGroupMode] = useState(false)
  const [groupSelection, setGroupSelection] = useState<string[]>([])
  const [winStats, setWinStats] = useState<Map<string, { wins: number; games: number }>>(new Map())

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
          .select('id, name, skill, status, queued_at, court, slot, group_id')
          .eq('session_id', id)
          .order('queued_at', { ascending: true })
        if (!cancelled) setPlayers(data ?? [])

        const { data: matchRows } = await supabase
          .from('matches')
          .select('player_ids, winner_side')
          .eq('session_id', id)
        if (!cancelled) setWinStats(computeWinStats(matchRows ?? []))
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
    const occupant = players.find((p) => p.status === 'playing' && p.court === court && p.slot === slot)
    if (occupant) {
      await supabase
        .from('players')
        .update({ status: 'queued', court: null, slot: null, queued_at: new Date().toISOString() })
        .eq('id', occupant.id)
    }

    await supabase.from('players').update({ status: 'playing', court, slot }).eq('id', playerId)
    setSelected(null)
  }

  async function assignGroup(groupId: string, court: number) {
    const members = players.filter((p) => p.group_id === groupId && p.status === 'queued')
    if (members.length === 0) return

    const occupied = players.filter((p) => p.status === 'playing' && p.court === court)
    const openSlots = [0, 1, 2, 3].filter((s) => !occupied.some((o) => o.slot === s))

    if (openSlots.length < members.length) {
      alert(`This court only has ${openSlots.length} open spot${openSlots.length === 1 ? '' : 's'} — the group needs ${members.length}.`)
      return
    }

    await Promise.all(
      members.map((p, i) =>
        supabase.from('players').update({ status: 'playing', court, slot: openSlots[i] }).eq('id', p.id)
      )
    )
    setSelectedGroup(null)
  }

  async function finishGame(court: number, winnerSide: 'a' | 'b' | null) {
    const onCourt = players
      .filter((p) => p.status === 'playing' && p.court === court)
      .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    if (onCourt.length === 0) return

    const ids = onCourt.map((p) => p.id)
    await supabase.from('matches').insert({ session_id: id, court, player_ids: ids, winner_side: winnerSide })

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

    const duplicate = players.some((p) => p.id !== playerId && p.name.toLowerCase() === clean.toLowerCase())
    if (duplicate) {
      alert(`"${clean}" is already taken in this session.`)
      return
    }

    const { error } = await supabase.from('players').update({ name: clean, skill: editSkill }).eq('id', playerId)
    if (error) {
      alert(error.code === '23505' ? `"${clean}" is already taken in this session.` : error.message)
      return
    }
    setEditingId(null)
  }

  function toggleGroupMode() {
    setGroupMode((v) => !v)
    setGroupSelection([])
    setSelectedGroup(null)
    setSelected(null)
  }

  function toggleGroupPick(playerId: string) {
    setGroupSelection((sel) =>
      sel.includes(playerId) ? sel.filter((pid) => pid !== playerId) : sel.length < 4 ? [...sel, playerId] : sel
    )
  }

  async function createGroup() {
    if (groupSelection.length !== 2 && groupSelection.length !== 4) {
      alert('Select exactly 2 or 4 players to group them.')
      return
    }
    const groupId = crypto.randomUUID()
    const now = new Date().toISOString()
    await supabase.from('players').update({ group_id: groupId, queued_at: now }).in('id', groupSelection)
    setGroupSelection([])
    setGroupMode(false)
  }

  async function removeFromGroup(player: Player) {
    if (!player.group_id) return
    const remaining = players.filter((p) => p.group_id === player.group_id && p.id !== player.id)

    await supabase
      .from('players')
      .update({ group_id: null, queued_at: new Date().toISOString() })
      .eq('id', player.id)

    if (remaining.length === 1) {
      await supabase.from('players').update({ group_id: null }).eq('id', remaining[0].id)
    }
  }

  async function dissolveGroup(groupId: string) {
    if (!confirm('Split this group back into individual queue spots?')) return
    const memberIds = players.filter((p) => p.group_id === groupId).map((p) => p.id)
    await supabase
      .from('players')
      .update({ group_id: null, queued_at: new Date().toISOString() })
      .in('id', memberIds)
    if (selectedGroup === groupId) setSelectedGroup(null)
  }

  function toggleSelectGroup(groupId: string) {
    setSelected(null)
    setSelectedGroup((g) => (g === groupId ? null : groupId))
  }

  async function autoAssignAll() {
    if (!session) return

    const { data: matchRows } = await supabase.from('matches').select('player_ids, winner_side').eq('session_id', id)

    const assignments = computeAutoAssignments(players, session.court_count, matchRows ?? [])

    for (const { court, group } of assignments) {
      await Promise.all(
        group.map((p, slot) =>
          supabase.from('players').update({ status: 'playing', court, slot }).eq('id', p.id)
        )
      )
    }
  }

  if (loading) return <main className="grid min-h-dvh place-items-center bg-[#f8fafc] text-slate-500">Loading…</main>
  if (!session) return <main className="grid min-h-dvh place-items-center bg-[#f8fafc] text-slate-600">Session not found.</main>

  const queue = players.filter((p) => p.status === 'queued')
  const onCourtCount = players.filter((p) => p.status === 'playing').length

  const queueItems = buildQueueItems(queue)
  let posCounter = 1
  const queueRows = queueItems.map((item) => {
    if (item.type === 'solo') {
      const pos = posCounter
      posCounter += 1
      return { ...item, pos }
    }
    const pos = posCounter
    posCounter += item.players.length
    return { ...item, pos, endPos: posCounter - 1 }
  })

  return (
    <main className="min-h-dvh bg-[#f8fafc] pb-20">
      <Header backHref="/admin" backLabel="New session" right={null} />

      <SessionHeader
        session={session}
        queueLength={queue.length}
        onCourtCount={onCourtCount}
        copied={copied}
        onCopyLink={copyLink}
        onCourtCountChange={setCourtCount}
        onToggleOpen={toggleOpen}
        onAutoAssign={autoAssignAll}
      />

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
          <CourtGrid
            session={session}
            players={players}
            selected={selected}
            selectedGroup={selectedGroup}
            onAssign={assign}
            onAssignGroup={assignGroup}
            onFinishGame={finishGame}
          />
          <QueuePanel
            queueRows={queueRows}
            winStats={winStats}
            queueLength={queue.length}
            selected={selected}
            selectedGroup={selectedGroup}
            setSelected={setSelected}
            setSelectedGroup={setSelectedGroup}
            quickName={quickName}
            quickSkill={quickSkill}
            setQuickName={setQuickName}
            setQuickSkill={setQuickSkill}
            onQuickAdd={quickAdd}
            groupMode={groupMode}
            groupSelection={groupSelection}
            onToggleGroupMode={toggleGroupMode}
            onToggleGroupPick={toggleGroupPick}
            onCreateGroup={createGroup}
            onDissolveGroup={dissolveGroup}
            onRemoveFromGroup={removeFromGroup}
            onToggleSelectGroup={toggleSelectGroup}
            editingId={editingId}
            editName={editName}
            editSkill={editSkill}
            setEditName={setEditName}
            setEditSkill={setEditSkill}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditingId(null)}
            onRemovePlayer={removePlayer}
          />
        </div>
      )}
    </main>
  )
}