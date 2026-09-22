'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no O/0/I/1, easy to read aloud
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default function AdminPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createSession(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    // Sign in as a guest organizer if we're not already signed in.
    const { data: cur } = await supabase.auth.getSession()
    let uid = cur.session?.user.id
    if (!uid) {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error || !data.user) {
        setError('Could not start a session. Reload and try again.')
        setBusy(false)
        return
      }
      uid = data.user.id
    }

    const { data: session, error: insertError } = await supabase
      .from('sessions')
      .insert({ code: randomCode(), name: name.trim() || 'Open Play', owner_id: uid })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setBusy(false)
      return
    }

    router.push(`/admin/${session.id}`)
  }

  return (
    <main style={{ padding: 20, maxWidth: 400 }}>
      <h1>Create a session</h1>
      <form onSubmit={createSession}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Session name (e.g. Tuesday Open Play)"
          style={{ width: '100%', padding: 8, marginBottom: 10 }}
        />
        <button disabled={busy} type="submit" style={{ padding: '8px 16px' }}>
          {busy ? 'Creating…' : 'Create session'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </main>
  )
}