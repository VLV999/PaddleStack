import Link from 'next/link'
import Header from '@/components/Header'


export default function Home() {
  return (
    <main className="min-h-dvh bg-[#f8fafc] text-[#0f172a]">
      <Header />

      <section className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2 md:py-20">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl">
            Run open play
            <br />
            without the clipboard.
          </h1>
          <p className="mt-5 max-w-md text-lg text-slate-600">
            Paddle Stack tracks the queue and the courts, so nobody has to shout names or remember whose turn it is.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="rounded-xl bg-[#0f2a3a] px-6 py-3 text-center font-semibold text-white hover:bg-[#0c2230]"
            >
              Start a session
            </Link>
            <JoinForm />
          </div>
        </div>

        <div className="hidden md:block">
          <CourtGraphic />
        </div>
      </section>

      <section className="mx-auto max-w-5xl divide-y divide-slate-200 border-y border-slate-200 px-6">
        <Step
          n="1"
          title="Start a session"
          body="Set how many courts you've got. Paddle Stack gives you a code to share."
        />
        <Step
          n="2"
          title="Players join with a name"
          body="No accounts. They type a name, pick a skill level, and land in the queue."
        />
        <Step
          n="3"
          title="Games cycle themselves"
          body="Assign the next four to an open court. Finish a game, they're back at the end of the line."
        />
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-10 text-sm text-slate-400">Paddle Stack</footer>
    </main>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-6 py-6">
      <span className="text-sm text-slate-400">{n}</span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-slate-600">{body}</p>
      </div>
    </div>
  )
}

function CourtGraphic() {
  return (
    <svg viewBox="0 0 400 260" className="w-full" role="img" aria-label="Illustration of a pickleball court">
      <rect x="10" y="10" width="380" height="240" rx="12" fill="#0f2a3a" />
      <rect x="30" y="30" width="340" height="200" rx="4" fill="#2f6f8f" />
      <line x1="200" y1="30" x2="200" y2="230" stroke="#e8f2f7" strokeWidth="2" />
      <line x1="30" y1="130" x2="370" y2="130" stroke="#e8f2f7" strokeWidth="2" opacity="0.5" />
      <circle cx="140" cy="90" r="10" fill="#d9f24a" />
    </svg>
  )
}

function JoinForm() {
  return (
    <form action="/join-redirect" className="flex overflow-hidden rounded-xl border border-slate-300 bg-white">
      <input
        name="code"
        placeholder="Enter code"
        maxLength={4}
        className="w-28 bg-transparent px-4 py-3 uppercase tracking-widest outline-none placeholder:normal-case placeholder:tracking-normal"
      />
      <button
        type="submit"
        className="bg-[#d9f24a] px-5 font-semibold text-[#0f2a3a] hover:brightness-95"
      >
        Join
      </button>
    </form>
  )
}