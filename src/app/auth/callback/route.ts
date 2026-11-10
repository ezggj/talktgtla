import { NextResponse } from 'next/server'

export function GET(request: Request) {
  return NextResponse.redirect(new URL('/', request.url))
}

export function POST(request: Request) {
  return NextResponse.redirect(new URL('/', request.url), 303)
}
