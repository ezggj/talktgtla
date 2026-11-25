'use client'

import dynamic from 'next/dynamic'
import { TonightShell } from '@/components/tonight/shell'

const NightMap = dynamic(() => import('@/components/tonight/night-map').then((mod) => mod.NightMap), {
  ssr: false,
  loading: () => <p className="note">地圖開緊…</p>,
})

export default function MapPage() {
  return (
    <TonightShell>
      <NightMap />
    </TonightShell>
  )
}
