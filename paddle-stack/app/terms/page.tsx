import Link from 'next/link'
import Header from '@/components/Header'

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-[#f8fafc]">
      <Header backHref="/" backLabel="Home" right={null} />
      <div className="mx-auto max-w-2xl px-6 py-12 text-slate-700">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0f172a]">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-[#0f172a]">Beta software</h2>
            <p className="mt-1">
              Paddle Stack is currently in beta. Features may change, and we can't guarantee the app will always be
              available or free of bugs. Use it accordingly — don't rely on it as the only record of anything
              important.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-[#0f172a]">Acceptable use</h2>
            <p className="mt-1">
              Sessions and the names/information in them should be used for running real open-play sessions. Don't
              use the app to harass other players, impersonate someone else, or submit false information.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-[#0f172a]">Organizer responsibility</h2>
            <p className="mt-1">
              If you create a session as an organizer, you're responsible for managing it — including removing
              players, ending the session, and resolving disputes between players. Paddle Stack is a tool to help
              run the session; it doesn't referee games or verify anyone's identity.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-[#0f172a]">No warranty</h2>
            <p className="mt-1">
              Paddle Stack is provided as-is, with no guarantee of uptime, accuracy, or fitness for a particular
              purpose. We're not liable for any issue arising from using the app to organize your games.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-[#0f172a]">Changes</h2>
            <p className="mt-1">
              These terms may change as the app develops. Continued use after a change means you accept the
              updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-[#0f172a]">Contact</h2>
            <p className="mt-1">
              Questions about these terms? Reach us at{' '}
              <a href="mailto:support@paddlestack.app" className="text-[#2f6f8f] underline">
                support@paddlestack.app
              </a>.
            </p>
          </section>
        </div>

        <Link href="/" className="mt-10 inline-block text-sm font-medium text-[#0f2a3a] underline-offset-4 hover:underline">
          ← Back to home
        </Link>
      </div>
    </main>
  )
}