'use client'

import type { Player, QueueItem } from '@/lib/types'

type QueueRow =
  | (Extract<QueueItem, { type: 'solo' }> & { pos: number })
  | (Extract<QueueItem, { type: 'group' }> & { pos: number; endPos: number })

type Props = {
  queueRows: QueueRow[]
  queueLength: number
  winStats: Map<string, { wins: number; games: number }>
  selected: string | null
  selectedGroup: string | null
  setSelected: (id: string | null) => void
  setSelectedGroup: (id: string | null) => void
  quickName: string
  quickSkill: string
  setQuickName: (v: string) => void
  setQuickSkill: (v: string) => void
  onQuickAdd: (e: React.FormEvent) => void
  groupMode: boolean
  groupSelection: string[]
  onToggleGroupMode: () => void
  onToggleGroupPick: (playerId: string) => void
  onCreateGroup: () => void
  onDissolveGroup: (groupId: string) => void
  onRemoveFromGroup: (player: Player) => void
  onToggleSelectGroup: (groupId: string) => void
  editingId: string | null
  editName: string
  editSkill: string
  setEditName: (v: string) => void
  setEditSkill: (v: string) => void
  onStartEdit: (p: Player) => void
  onSaveEdit: (playerId: string) => void
  onCancelEdit: () => void
  onRemovePlayer: (playerId: string, name: string) => void
}

function record(p: Player, winStats: Map<string, { wins: number; games: number }>) {
  const s = winStats.get(p.id)
  if (!s || s.games === 0) return null
  const pct = Math.round((s.wins / s.games) * 100)
  return `${s.wins}-${s.games - s.wins} (${pct}%)`
}

export default function QueuePanel({
  queueRows,
  queueLength,
  winStats,
  selected,
  selectedGroup,
  setSelected,
  setSelectedGroup,
  quickName,
  quickSkill,
  setQuickName,
  setQuickSkill,
  onQuickAdd,
  groupMode,
  groupSelection,
  onToggleGroupMode,
  onToggleGroupPick,
  onCreateGroup,
  onDissolveGroup,
  onRemoveFromGroup,
  onToggleSelectGroup,
  editingId,
  editName,
  editSkill,
  setEditName,
  setEditSkill,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onRemovePlayer,
}: Props) {
  function selectSolo(p: Player) {
    if (groupMode) return
    setSelectedGroup(null)
    setSelected(selected === p.id ? null : p.id)
  }

  return (
    <aside>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Queue</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleGroupMode}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              groupMode ? 'bg-[#0f2a3a] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {groupMode ? 'Cancel' : 'Group players'}
          </button>
          <span className="rounded-full bg-[#0f2a3a] px-2.5 py-0.5 text-xs font-semibold text-white">
            {queueLength}
          </span>
        </div>
      </div>

      <form onSubmit={onQuickAdd} className="mb-4 flex gap-2">
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

      {groupMode && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-[#2f6f8f]/10 px-3 py-2 text-xs text-[#2f6f8f]">
          <span>{groupSelection.length} selected — pick 2 or 4</span>
          <button
            onClick={onCreateGroup}
            disabled={groupSelection.length !== 2 && groupSelection.length !== 4}
            className="rounded-md bg-[#0f2a3a] px-2 py-1 text-xs font-semibold text-white disabled:opacity-30"
          >
            Link group
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {selected && !groupMode && (
          <p className="mb-2 px-1 text-xs text-slate-500">Tap an open court slot to place this player.</p>
        )}
        {selectedGroup && (
          <p className="mb-2 px-1 text-xs text-slate-500">Tap "Place group here" on a court with enough room.</p>
        )}
        {queueRows.length === 0 ? (
          <p className="px-1 py-2 text-sm text-slate-400">Nobody waiting.</p>
        ) : (
          <ol className="space-y-1">
            {queueRows.map((row) => {
              if (row.type === 'solo') {
                const p = row.player
                if (editingId === p.id) {
                  return (
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
                        onClick={() => onSaveEdit(p.id)}
                        className="rounded-md bg-[#0f2a3a] px-2 py-1 text-xs font-semibold text-white"
                      >
                        Save
                      </button>
                      <button onClick={onCancelEdit} className="text-xs text-slate-400 hover:text-slate-600">
                        Cancel
                      </button>
                    </li>
                  )
                }
                return (
                  <li
                    key={p.id}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      selected === p.id ? 'bg-[#d9f24a] font-semibold text-[#0f2a3a]' : 'hover:bg-slate-50'
                    }`}
                  >
                    {groupMode ? (
                      <input
                        type="checkbox"
                        checked={groupSelection.includes(p.id)}
                        onChange={() => onToggleGroupPick(p.id)}
                        className="h-4 w-4 flex-none accent-[#0f2a3a]"
                      />
                    ) : (
                      <span
                        onClick={() => selectSolo(p)}
                        className={`flex h-5 w-5 flex-none cursor-pointer items-center justify-center rounded-full text-[10px] ${
                          selected === p.id ? 'bg-[#0f2a3a] text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {row.pos}
                      </span>
                    )}
                    <span
                      onClick={() => selectSolo(p)}
                      className={`flex-1 truncate ${groupMode ? '' : 'cursor-pointer'}`}
                    >
                      {p.name}
                    </span>
                    <span className={`text-right ${selected === p.id ? 'text-[#0f2a3a]/70' : 'text-slate-400'}`}>
                      <span className="block">{p.skill}</span>
                      {record(p, winStats) && <span className="block text-[10px]">{record(p, winStats)}</span>}
                    </span>
                    {!groupMode && (
                      <>
                        <button
                          onClick={() => onStartEdit(p)}
                          className="text-xs text-slate-400 opacity-0 hover:text-slate-600 group-hover:opacity-100"
                          aria-label={`Edit ${p.name}`}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onRemovePlayer(p.id, p.name)}
                          className="text-xs text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
                          aria-label={`Remove ${p.name}`}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </li>
                )
              }

              // Grouped cluster
              const isSelectedGroup = selectedGroup === row.groupId
              return (
                <li
                  key={row.groupId}
                  className={`rounded-lg border p-2 ${
                    isSelectedGroup ? 'border-[#d9f24a] bg-[#d9f24a]/10' : 'border-[#2f6f8f]/30 bg-[#2f6f8f]/5'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between px-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#2f6f8f]">
                      Group · {row.pos === row.endPos ? `#${row.pos}` : `#${row.pos}–${row.endPos}`}
                    </span>
                    {!groupMode && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleSelectGroup(row.groupId)}
                          className={`text-[10px] font-semibold ${
                            isSelectedGroup ? 'text-[#0f2a3a]' : 'text-[#2f6f8f] hover:text-[#0f2a3a]'
                          }`}
                        >
                          {isSelectedGroup ? 'Selected ✓' : 'Select group'}
                        </button>
                        <button
                          onClick={() => onDissolveGroup(row.groupId)}
                          className="text-[10px] font-medium text-slate-400 hover:text-red-600"
                        >
                          Ungroup
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    {row.players.map((p) =>
                      editingId === p.id ? (
                        <div key={p.id} className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5">
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
                            onClick={() => onSaveEdit(p.id)}
                            className="rounded-md bg-[#0f2a3a] px-2 py-1 text-xs font-semibold text-white"
                          >
                            Save
                          </button>
                          <button onClick={onCancelEdit} className="text-xs text-slate-400 hover:text-slate-600">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div key={p.id} className="group flex items-center gap-2 rounded-md bg-white px-2 py-1.5 text-sm">
                          <span
                            onClick={() => selectSolo(p)}
                            className={`flex-1 truncate ${!groupMode ? 'cursor-pointer' : ''} ${
                              selected === p.id ? 'font-semibold text-[#0f2a3a]' : ''
                            }`}
                          >
                            {p.name}
                          </span>
                          <span className="text-right text-slate-400">
                            <span className="block">{p.skill}</span>
                            {record(p, winStats) && <span className="block text-[10px]">{record(p, winStats)}</span>}
                          </span>
                          {!groupMode && (
                            <>
                              <button
                                onClick={() => onStartEdit(p)}
                                className="text-xs text-slate-400 opacity-0 hover:text-slate-600 group-hover:opacity-100"
                                aria-label={`Edit ${p.name}`}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => onRemoveFromGroup(p)}
                                className="text-xs text-slate-400 opacity-0 hover:text-amber-600 group-hover:opacity-100"
                                aria-label={`Remove ${p.name} from group`}
                                title="Remove from group"
                              >
                                ↩
                              </button>
                              <button
                                onClick={() => onRemovePlayer(p.id, p.name)}
                                className="text-xs text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
                                aria-label={`Remove ${p.name}`}
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </aside>
  )
}