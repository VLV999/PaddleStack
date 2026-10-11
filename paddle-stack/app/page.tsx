'use client'

import { useState } from 'react'
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

      <section id="faq" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0f172a]">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
          <FaqItem
            q="Do players need to download anything or create an account?"
            a="No. Players just open a link, type their name, and pick a skill level. No app, no account."
          />
          <FaqItem
            q="Does the organizer need an account?"
            a="Yes, so you can always get back to your sessions from any device. You can sign up with Google or email."
          />
          <FaqItem
            q="Is it free to use?"
            a="Yes, Paddle Stack is free during the beta."
          />
          <FaqItem
            q="Can players be grouped as partners?"
            a="Yes. The organizer can link 2 or 4 players as a group, and they'll move through the queue and onto a court together."
          />
          <FaqItem
            q="What happens if I close the tab while I'm waiting in the queue?"
            a="Your spot is saved on that device as long as you don't clear your browser data. Reopening the same link brings you back to your place in line."
          />
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-[#0f2a3a] text-white/70">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <p className="text-lg font-extrabold tracking-tight text-white">Paddle Stack</p>
              <p className="mt-2 text-sm">Run open play without the clipboard.</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Support</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
                <li><a href="mailto:support@paddlestack.app" className="hover:text-white">Contact us</a></li>
                <li><a href="mailto:support@paddlestack.app?subject=Feedback" className="hover:text-white">Send feedback</a></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/admin" className="hover:text-white">Start a session</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Legal</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/40">
            © {new Date().getFullYear()} Paddle Stack
          </div>
        </div>
      </footer>
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

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="py-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-medium text-[#0f172a]">{q}</span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && <p className="mt-2 text-sm text-slate-600">{a}</p>}
    </div>
  )
}