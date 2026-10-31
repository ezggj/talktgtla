import type { Metadata } from 'next'
import { SettingsClient } from './settings-client'

export const metadata: Metadata = {
  title: '設定',
  description: '主題色、深淺、字體、通知、PWA 同音效——Talk tgt la 個人設定',
}

export default function MeSettingsPage() {
  return <SettingsClient />
}
