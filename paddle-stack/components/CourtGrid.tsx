'use client'

import type { Session, Player } from '@/lib/types'
import { skillDotClass, skillLabel } from '@/lib/matchmaking'

type Props = {
  session: Session
  players: Player[]
  selected: string | null
  selectedGroup: string | null
  onAssign: (playerId: string, court: number, slot: number) => void
  onAssignGroup: (groupId: string, court: number) => void
  onFinishGame: (court: number, winnerSide: 'a' | 'b' | null) => void
}

export default function CourtGrid({
  session,
  players,
  selected,
  selectedGroup,
  onAssign,
  onAssignGroup,
  onFinishGame,
}: Props) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Courts</h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Beginner
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Intermediate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#d9f24a]" /> Advanced
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: session.court_count }, (_, c) => {
          const onCourt = players
            .filter((p) => p.status === 'playing' && p.court === c)
            .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
          const filled = onCourt.length
          const label = filled === 0 ? 'Open' : filled === 4 ? 'In play' : `${filled}/4`
          const openSlotsCount = 4 - filled
          const groupNeeds = selectedGroup
            ? players.filter((p) => p.group_id === selectedGroup && p.status === 'queued').length
            : 0
          const canPlaceGroupHere = !!selectedGroup && groupNeeds > 0 && openSlotsCount >= groupNeeds

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
                          onClick={() => selected && onAssign(selected, c, slot)}
                          className={`rounded-lg border border-dashed px-2 py-2 text-center text-xs transition-colors ${
                            selected
                              ? 'cursor-pointer border-[#d9f24a] bg-white/10 hover:bg-white/20'
                              : 'border-white/30 bg-white/5'
                          }`}
                        >
                          {p ? (
                            <span className="flex items-center justify-center gap-1.5 font-medium text-white">
                              <span
                                title={skillLabel(p.skill)}
                                className={`h-2.5 w-2.5 flex-none rounded-full ring-1 ring-white/70 ${skillDotClass(p.skill)}`}
                              />
                              {p.name}
                            </span>
                          ) : (
                            <span className="text-white/50">Open</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {selectedGroup && (
                <button
                  onClick={() => onAssignGroup(selectedGroup, c)}
                  disabled={!canPlaceGroupHere}
                  className="mt-2 w-full rounded-xl bg-[#d9f24a] py-2 text-xs font-semibold text-[#0f2a3a] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Place group here
                </button>
              )}

              {filled === 4 ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onFinishGame(c, 'a')}
                    className="rounded-xl bg-[#0f2a3a] py-2 text-xs font-semibold text-white hover:bg-[#0c2230]"
                  >
                    Team 1 won
                  </button>
                  <button
                    onClick={() => onFinishGame(c, 'b')}
                    className="rounded-xl bg-[#0f2a3a] py-2 text-xs font-semibold text-white hover:bg-[#0c2230]"
                  >
                    Team 2 won
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onFinishGame(c, null)}
                  disabled={filled === 0}
                  className="mt-2 w-full rounded-xl bg-[#0f2a3a] py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Finish game
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}