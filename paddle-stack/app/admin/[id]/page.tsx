'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Session = {
  id: string
  code: string
  name: string
  court_count: number
  is_open: boolean
}

export default function AdminSessionPage() {
  const { id } = useParams<{ id: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('sessions')
      .select('id, code, name, court_count, is_open')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setSession(data)
        setLoading(false)
      })
  }, [id])

  if (loading) return <main style={{ padding: 20 }}>Loading…</main>
  if (!session) return <main style={{ padding: 20 }}>Session not found.</main>

  return (
    <main style={{ padding: 20 }}>
      <h1>{session.name}</h1>
      <p>Join code: <strong>{session.code}</strong></p>
      <p>Courts: {session.court_count}</p>
      <p>Join link: {`http://localhost:3000/join/${session.code}`}</p>
    </main>
  )
}