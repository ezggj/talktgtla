'use client'

import Link from 'next/link'
import { ChevronLeft, Settings } from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { PageHeader } from '@/components/ui/page-header'
import { Stagger, StaggerItem } from '@/components/motion/stagger'
import { ThemeToggleCard } from '@/components/shell/theme-toggle'
import { FontScaleCard } from '@/components/shell/font-scale-card'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { NotificationsCard } from '@/components/settings/notifications-card'
import { SoundToggleCard } from '@/components/settings/sound-toggle-card'
import { DisplayNameCard } from '@/components/settings/display-name-card'
import { PublicWallCard } from '@/components/settings/public-wall-card'
import { ProteinReminderCard } from '@/components/fitness/protein-reminder-card'
import { CardDesc } from '@/components/ui/card'

export function SettingsClient() {
  return (
    <AppShell>
      <PageTransition className="max-w-lg mx-auto">
        <Link
          href="/me"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-accent mb-3 touch-manipulation"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          返「我」
        </Link>
        <PageHeader
          compact
          eyebrow="設定"
          title="個人化同通知"
          description="主題、字體、通知、加主畫面——全部留喺呢部機。"
        />

        <Stagger className="space-y-4">
          <StaggerItem>
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted px-0.5">
              <Settings className="h-3.5 w-3.5" />
              外觀
            </div>
          </StaggerItem>
          <StaggerItem>
            <ThemeToggleCard />
          </StaggerItem>
          <StaggerItem>
            <FontScaleCard />
          </StaggerItem>

          <StaggerItem>
            <div className="pt-1 text-[11px] font-medium text-muted px-0.5">通知同裝置</div>
          </StaggerItem>
          <StaggerItem>
            <NotificationsCard />
          </StaggerItem>
          <StaggerItem>
            <InstallPrompt variant="card" />
          </StaggerItem>
          <StaggerItem>
            <ProteinReminderCard />
          </StaggerItem>

          <StaggerItem>
            <div className="pt-1 text-[11px] font-medium text-muted px-0.5">訓練同凑局</div>
          </StaggerItem>
          <StaggerItem>
            <SoundToggleCard />
          </StaggerItem>
          <StaggerItem>
            <DisplayNameCard />
          </StaggerItem>
          <StaggerItem>
            <PublicWallCard />
          </StaggerItem>

          <StaggerItem>
            <div className="pt-1 text-[11px] font-medium text-muted px-0.5">私隱同免責</div>
          </StaggerItem>
          <StaggerItem>
            <CardDesc className="text-[12px] leading-relaxed px-1">
              傾偈可以匿名；凑局花名唔會自動綁去聊天室。訓練／飲食登入後可上雲，本機設定清瀏覽器會冇。詳情見免責聲明。
            </CardDesc>
          </StaggerItem>
          <StaggerItem>
            <Link
              href="/disclaimer"
              className="flex items-center justify-between rounded-[20px] border border-border bg-surface px-4 py-3.5 shadow-soft hover:border-accent/40 transition touch-manipulation"
            >
              <span className="text-sm font-semibold">免責聲明</span>
              <span className="text-accent text-sm font-medium">完整版 →</span>
            </Link>
          </StaggerItem>
          <StaggerItem>
            <CardDesc className="text-center text-[11px] px-2 pb-2">
              設定用 localStorage，唔會上雲。清瀏覽器資料會重置。
            </CardDesc>
          </StaggerItem>
        </Stagger>
      </PageTransition>
    </AppShell>
  )
}
