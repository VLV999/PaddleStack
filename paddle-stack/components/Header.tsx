'use client'

import Link from 'next/link'

type HeaderProps = {
  backHref?: string
  backLabel?: string
  right?: React.ReactNode
}

export default function Header({ backHref, backLabel = 'Back', right }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-[#0f172a]"
            >
              <span aria-hidden>←</span> {backLabel}
            </Link>
          )}
          <Link href="/" className="text-lg font-extrabold tracking-tight text-[#0f172a]">
            Paddle Stack
          </Link>
        </div>
        {right !== undefined ? right : (
          <Link href="/admin" className="text-sm font-medium text-[#0f2a3a] underline-offset-4 hover:underline">
            Organizer login
          </Link>
        )}
      </div>
    </header>
  )
}