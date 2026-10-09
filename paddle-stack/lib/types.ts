export type Session = {
  id: string
  code: string
  name: string
  court_count: number
  is_open: boolean
}

export type Player = {
  id: string
  name: string
  skill: string
  status: string
  queued_at: string
  court: number | null
  slot: number | null
  group_id: string | null
}

export type QueueItem =
  | { type: 'solo'; player: Player }
  | { type: 'group'; groupId: string; players: Player[] }

export type Unit = { ids: string[]; players: Player[]; size: number }