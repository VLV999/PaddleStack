'use client'

import type { Session } from '@/lib/types'

type Props = {
  session: Session
  queueLength: number
  onCourtCount: number
  copied: boolean
  onCopyLink: () => void
  onCourtCountChange: (next: number) => void
  onToggleOpen: () => void
  onAutoAssign: () => void
}

export default function SessionHeader({
  session,
  queueLength,
  onCourtCount,
  copied,
  onCopyLink,
  onCourtCountChange,
  onToggleOpen,
  onAutoAssign,
}: Props) {
  return (
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
            onClick={onToggleOpen}
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
            onClick={onCopyLink}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium ring-1 ring-white/20 hover:bg-white/20"
          >
            <span className="tracking-[0.15em]">{session.code}</span>
            <span className="text-white/40">·</span>
            <span>{copied ? 'Copied!' : 'Copy join link'}</span>
          </button>

          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-2 ring-1 ring-white/20">
            <button
              onClick={() => onCourtCountChange(session.court_count - 1)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Fewer courts"
            >
              −
            </button>
            <span className="px-1 text-xs text-white/50">{session.court_count} courts</span>
            <button
              onClick={() => onCourtCountChange(session.court_count + 1)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="More courts"
            >
              +
            </button>
          </div>

          <button
            onClick={onAutoAssign}
            disabled={queueLength < 4}
            className="rounded-lg bg-[#d9f24a] px-3 py-2 text-sm font-semibold text-[#0f2a3a] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Auto-assign
          </button>

          <span className="ml-auto text-xs text-white/50">
            {onCourtCount} playing · {queueLength} waiting
          </span>
        </div>
      </div>
    </header>
  )
}