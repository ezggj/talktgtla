'use client'

import Link from 'next/link'
import {
  DISCLAIMER_PATH,
  DISCLAIMER_SECTIONS,
  DISCLAIMER_SHORT_BULLETS,
  DISCLAIMER_TITLE,
  DISCLAIMER_UPDATED,
} from '@/lib/legal/disclaimer'

/** Compact expandable summary for chat footer */
export function DisclaimerShort({
  expanded,
  onToggle,
}: {
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-center text-[11px] text-muted hover:text-foreground transition-colors"
        aria-expanded={expanded}
      >
        {DISCLAIMER_TITLE}
        {expanded ? ' · 收起' : ' · 詳情'}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed text-muted marker:text-muted">
            {DISCLAIMER_SHORT_BULLETS.map((line) => (
              <li key={line.slice(0, 24)}>{line}</li>
            ))}
          </ul>
          <p className="text-center">
            <Link
              href={DISCLAIMER_PATH}
              className="text-[11px] font-medium text-accent hover:underline touch-manipulation"
            >
              睇完整免責聲明 →
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}

/** Full structured disclaimer body (page content) */
export function DisclaimerFull() {
  return (
    <article className="space-y-5 text-[13px] leading-relaxed text-foreground/90">
      <p className="text-[12px] text-muted">
        Talk tgt la 有傾偈、訓練、飲食（包括影餐估營養）、會所比較同凑局。用之前睇清楚以下說明。最後更新：
        {DISCLAIMER_UPDATED}。
      </p>
      {DISCLAIMER_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
          <ul className="list-disc pl-4 space-y-1.5 text-[12px] text-muted marker:text-accent/70">
            {section.bullets.map((b) => (
              <li key={b.slice(0, 32)} className="leading-relaxed">
                {b}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  )
}

/** Inline one-liner + link used near sensitive UI */
export function DisclaimerInlineNote({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={className ?? 'text-[10px] text-muted text-center leading-relaxed px-1'}>
      {children}{' '}
      <Link href={DISCLAIMER_PATH} className="text-accent font-medium hover:underline touch-manipulation">
        免責
      </Link>
    </p>
  )
}

export { DISCLAIMER_PATH, DISCLAIMER_TITLE }
