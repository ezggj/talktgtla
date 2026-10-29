import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'

export async function GET() {
  const admin = await isAdminRequest()
  return NextResponse.json({ admin })
}
