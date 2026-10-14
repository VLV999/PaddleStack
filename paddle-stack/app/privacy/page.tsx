import Link from 'next/link'
import Header from '@/components/Header'

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-[#f8fafc]">
      <Header backHref="/" backLabel="Home" right={null} />
      <div className="mx-auto max-w-2xl px-6 py-12 text-slate-700">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0f172a]">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-[#0f172a]">What we collect</h2>
            <p className="mt-1">
              If you join a session as a player, we store the name and skill level you enter, your status in the
              queue or on a court, and your win/loss record for that session. We do not ask for your email, phone
              number, or any other personal information to join as a player.
            </p>
            <p className="mt-1">
              If you sign in as an organizer, we store your Google account email and name, so you can access
              sessions you've created.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-[#0f172a]">How we use it</h2>
            <p className="mt-1">
              Player information is used only to run the session you're part of — showing the queue, courts, and
              matchmaking. Organizer account information is used to let you sign in and see the sessions you've
              created.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-[#0f172a]">Who can see it</h2>
            <p className="mt-1">
              Anyone with the link to a session can see the names and skill levels of players in that session — this
              is by design, so players can see who they're playing with. We don't sell or share your information
              with anyone outside of running the app.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-[#0f172a]">Data storage</h2>
            <p className="mt-1">
              Data is stored with Supabase, our database provider. Session data persists until you or the organizer
              deletes it, or a player is removed from a session by the organizer.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-[#0f172a]">Questions</h2>
            <p className="mt-1">
              If you have questions about your data, contact us at{' '}
              <a href="mailto:support@paddlestack.app" className="text-[#2f6f8f] underline">
                support@paddlestack.app
              </a>.
            </p>
          </section>

          <p className="text-xs text-slate-400">
            Paddle Stack is currently in beta. This policy may change as the app develops — check back for updates.
          </p>
        </div>

        <Link href="/" className="mt-10 inline-block text-sm font-medium text-[#0f2a3a] underline-offset-4 hover:underline">
          ← Back to home
        </Link>
      </div>
    </main>
  )
}