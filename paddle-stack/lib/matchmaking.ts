import type { Player, QueueItem, Unit } from './types'

export const skillValue = (s: string) => (s === 'beginner' ? 0 : s === 'advanced' ? 2 : 1)

export const skillDotClass = (s: string) =>
  s === 'beginner' ? 'bg-slate-300' : s === 'advanced' ? 'bg-[#d9f24a]' : 'bg-sky-400'

export const skillLabel = (s: string) =>
  s === 'beginner' ? 'Beginner' : s === 'advanced' ? 'Advanced' : 'Intermediate'

export function buildQueueItems(queue: Player[]): QueueItem[] {
  const seen = new Set<string>()
  const items: QueueItem[] = []
  for (const p of queue) {
    if (seen.has(p.id)) continue
    if (p.group_id) {
      const members = queue.filter((q) => q.group_id === p.group_id)
      members.forEach((m) => seen.add(m.id))
      items.push({ type: 'group', groupId: p.group_id, players: members })
    } else {
      seen.add(p.id)
      items.push({ type: 'solo', player: p })
    }
  }
  return items
}

export function buildUnits(queue: Player[]): Unit[] {
  const seen = new Set<string>()
  const units: Unit[] = []
  for (const p of queue) {
    if (seen.has(p.id)) continue
    if (p.group_id) {
      const members = queue.filter((q) => q.group_id === p.group_id)
      members.forEach((m) => seen.add(m.id))
      units.push({ ids: members.map((m) => m.id), players: members, size: members.length })
    } else {
      seen.add(p.id)
      units.push({ ids: [p.id], players: [p], size: 1 })
    }
  }
  return units
}

export type MatchRow = { player_ids: string[]; winner_side: 'a' | 'b' | null }

const MIN_GAMES_FOR_WIN_RATE = 2
const MAX_WIN_RATE_ADJUSTMENT = 0.6

// player_ids is stored in slot order [0,1,2,3]: indices 0-1 are side A, 2-3 are side B.
export function computeWinStats(matchRows: MatchRow[]): Map<string, { wins: number; games: number }> {
  const stats = new Map<string, { wins: number; games: number }>()
  for (const m of matchRows) {
    m.player_ids.forEach((playerId, i) => {
      const entry = stats.get(playerId) ?? { wins: 0, games: 0 }
      entry.games += 1
      if (m.winner_side === 'a' && i < 2) entry.wins += 1
      if (m.winner_side === 'b' && i >= 2) entry.wins += 1
      stats.set(playerId, entry)
    })
  }
  return stats
}

function effectiveSkillValue(p: Player, winStats: Map<string, { wins: number; games: number }>) {
  const base = skillValue(p.skill)
  const stats = winStats.get(p.id)
  if (!stats || stats.games < MIN_GAMES_FOR_WIN_RATE) return base
  const rate = stats.wins / stats.games
  const adjustment = Math.max(-MAX_WIN_RATE_ADJUSTMENT, Math.min(MAX_WIN_RATE_ADJUSTMENT, (rate - 0.5) * 2 * MAX_WIN_RATE_ADJUSTMENT))
  return base + adjustment
}

const WINDOW_UNITS = 8

export function computeAutoAssignments(
  allPlayers: Player[],
  courtCount: number,
  matchRows: MatchRow[]
): { court: number; group: Player[] }[] {
  const playedTogether = new Set<string>()
  matchRows.forEach((m) => {
    const ids = m.player_ids
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        playedTogether.add([ids[i], ids[j]].sort().join('|'))
      }
    }
  })

  const winStats = computeWinStats(matchRows)

  function repeatCount(flat: Player[]) {
    let count = 0
    for (let i = 0; i < flat.length; i++) {
      for (let j = i + 1; j < flat.length; j++) {
        if (playedTogether.has([flat[i].id, flat[j].id].sort().join('|'))) count++
      }
    }
    return count
  }

  function scoreCombo(combo: Unit[], unitIndices: number[]) {
    const flat = combo.flatMap((u) => u.players)
    const skills = flat.map((p) => effectiveSkillValue(p, winStats))
    const spread = Math.max(...skills) - Math.min(...skills)
    const waitPenalty = unitIndices.reduce((a, b) => a + b, 0)
    return repeatCount(flat) * 1000 + spread * 10 + waitPenalty * 0.1
  }

  function subsetsSummingToFour(pool: Unit[]): { combo: Unit[]; indices: number[] }[] {
    const results: { combo: Unit[]; indices: number[] }[] = []
    const n = pool.length
    for (let mask = 1; mask < 1 << n; mask++) {
      let sum = 0
      const combo: Unit[] = []
      const indices: number[] = []
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          sum += pool[i].size
          if (sum > 4) break
          combo.push(pool[i])
          indices.push(i)
        }
      }
      if (sum === 4) results.push({ combo, indices })
    }
    return results
  }

  function placeCourt(combo: Unit[]): Player[] {
    const fourUnit = combo.find((u) => u.size === 4)
    const pairUnits = combo.filter((u) => u.size === 2)
    const soloUnits = combo.filter((u) => u.size === 1)

    let sideA: Player[]
    let sideB: Player[]

    if (fourUnit) {
      const sorted = [...fourUnit.players].sort(
        (a, b) => effectiveSkillValue(a, winStats) - effectiveSkillValue(b, winStats)
      )
      sideA = [sorted[0], sorted[2]]
      sideB = [sorted[1], sorted[3]]
    } else if (pairUnits.length === 2) {
      sideA = pairUnits[0].players
      sideB = pairUnits[1].players
    } else if (pairUnits.length === 1) {
      sideA = pairUnits[0].players
      sideB = soloUnits.map((u) => u.players[0])
    } else {
      const sorted = soloUnits
        .map((u) => u.players[0])
        .sort((a, b) => effectiveSkillValue(a, winStats) - effectiveSkillValue(b, winStats))
      sideA = [sorted[0], sorted[2]]
      sideB = [sorted[1], sorted[3]]
    }

    return [sideA[0], sideA[1], sideB[0], sideB[1]]
  }

  let workingQueue = allPlayers
    .filter((p) => p.status === 'queued')
    .sort((a, b) => a.queued_at.localeCompare(b.queued_at))

  const assignments: { court: number; group: Player[] }[] = []

  for (let c = 0; c < courtCount; c++) {
    const isEmpty = allPlayers.every((p) => !(p.status === 'playing' && p.court === c))
    if (!isEmpty) continue

    const units = buildUnits(workingQueue)
    if (units.length === 0) continue

    const pool = units.slice(0, WINDOW_UNITS)
    const allCandidates = subsetsSummingToFour(pool)

    // The person (or group) at the front of the queue must always be
    // included — we only choose skill-balanced partners around them,
    // never skip past them for a tighter skill match elsewhere.
    const candidates = allCandidates.filter((cand) => cand.indices.includes(0))
    if (candidates.length === 0) continue

    let best = candidates[0]
    let bestScore = scoreCombo(best.combo, best.indices)
    for (const cand of candidates.slice(1)) {
      const s = scoreCombo(cand.combo, cand.indices)
      if (s < bestScore) {
        best = cand
        bestScore = s
      }
    }

    const flatIds = new Set(best.combo.flatMap((u) => u.ids))
    assignments.push({ court: c, group: placeCourt(best.combo) })
    workingQueue = workingQueue.filter((p) => !flatIds.has(p.id))
  }

  return assignments
}