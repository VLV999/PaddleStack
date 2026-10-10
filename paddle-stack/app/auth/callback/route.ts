import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (code) {
    const response = NextResponse.redirect(new URL('/admin', req.url))
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)
    return response
  }

  return NextResponse.redirect(new URL('/admin', req.url))
}