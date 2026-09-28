'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no O/0/I/1, easy to read aloud
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default function AdminPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [courts, setCourts] = useState(4)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createSession(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

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
      .insert({ code: randomCode(), name: name.trim() || 'Open Play', owner_id: uid, court_count: courts })
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
    <main className="min-h-dvh bg-[#f8fafc]">
      <Header backHref="/" backLabel="Home" right={null} />

      <div className="mx-auto max-w-sm px-6 py-16">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0f172a]">Start a session</h1>
        <p className="mt-1 text-sm text-slate-500">Set up your courts, and you'll get a code to share with players.</p>

        <form onSubmit={createSession} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-600">
              Session name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tuesday Open Play"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2f6f8f] focus:ring-2 focus:ring-[#2f6f8f]/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Number of courts</label>
            <div className="flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-2">
              <button
                type="button"
                onClick={() => setCourts((c) => Math.max(1, c - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Fewer courts"
              >
                −
              </button>
              <span className="flex-1 text-center font-semibold text-[#0f172a]">{courts}</span>
              <button
                type="button"
                onClick={() => setCourts((c) => Math.min(12, c + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="More courts"
              >
                +
              </button>
            </div>
          </div>

          <button
            disabled={busy}
            type="submit"
            className="w-full rounded-xl bg-[#0f2a3a] py-3 font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create session'}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <ul className="mt-10 space-y-3 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <li>No account needed — you'll join as the organizer automatically.</li>
          <li>You'll get a short code and link to share with players.</li>
          <li>You can change the number of courts anytime from the session dashboard.</li>
        </ul>
      </div>
    </main>
  )
}