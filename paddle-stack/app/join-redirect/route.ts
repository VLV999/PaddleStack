import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.redirect(new URL('/', req.url))
  return NextResponse.redirect(new URL(`/join/${code}`, req.url))
}