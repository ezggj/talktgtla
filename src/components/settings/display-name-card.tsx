'use client'

import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  loadMeetupDisplayName,
  saveMeetupDisplayName,
} from '@/lib/fitness/meetups'

export function DisplayNameCard() {
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setName(loadMeetupDisplayName())
  }, [])

  const persist = () => {
    const v = name.trim().slice(0, 24)
    setName(v)
    saveMeetupDisplayName(v)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  return (
    <Card className="py-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <UserRound className="h-4 w-4" />
        </div>
        <div>
          <CardTitle className="text-lg">凑局顯示名</CardTitle>
          <CardDesc className="mt-0.5">
            開台／入台用嘅花名。傾偈室仍然可以揀匿名，唔會自動綁呢個名。花名唔等於實名認證——線下見面請自行判斷。
          </CardDesc>
        </div>
      </div>
      <label className="block text-[11px] text-muted mb-1">花名（最多 24 字）</label>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 24))}
        placeholder="例如：小西灣阿強"
        maxLength={24}
      />
      <Button type="button" className="w-full mt-3" variant="secondary" onClick={persist}>
        {saved ? '存好喇 ✓' : '儲低顯示名'}
      </Button>
    </Card>
  )
}
