'use client'

import Link from 'next/link'
import { Building2, ChevronRight } from 'lucide-react'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/** Entry point on 我 → /me/gyms */
export function HkGymEntryCard() {
  return (
    <Link href="/me/gyms" className="block group">
      <Card hover className="py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-accent-soft flex items-center justify-center">
            <Building2 className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">香港健身房對比</CardTitle>
              <Badge tone="accent">新</Badge>
            </div>
            <CardDesc className="text-[12px] mt-0.5">
              247、EFX 等——地區、價錢、24 小時、器材一齊睇
            </CardDesc>
          </div>
          <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent transition-colors shrink-0" />
        </div>
      </Card>
    </Link>
  )
}
