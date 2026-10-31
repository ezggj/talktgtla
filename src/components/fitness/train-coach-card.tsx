'use client'

import { Sparkles } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buildTrainCoachBlurb } from '@/lib/fitness/weekly-summary'
import type { WorkoutSession } from '@/lib/fitness/storage'
import { TEMPLATES } from '@/lib/fitness/exercises'
import { cn } from '@/lib/utils'

export function TrainCoachCard({
  sessions,
  onStartTemplate,
  className,
}: {
  sessions: WorkoutSession[]
  onStartTemplate?: (templateId: string, exerciseIds: string[]) => void
  className?: string
}) {
  const c = buildTrainCoachBlurb(sessions)
  const tone = c.vibe === 'fire' || c.vibe === 'solid' ? 'accent' : 'muted'
  const tpl = c.suggestTemplateId
    ? TEMPLATES.find((t) => t.id === c.suggestTemplateId)
    : undefined

  return (
    <Card className={cn('py-4 border-accent/20 bg-accent-soft/20', className)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-accent shrink-0" />
          <CardTitle className="text-lg leading-snug">{c.title}</CardTitle>
        </div>
        <Badge tone={tone === 'accent' ? 'accent' : 'muted'}>七日教練</Badge>
      </div>
      <ul className="space-y-2 mb-3">
        {c.lines.map((line, i) => (
          <li key={i} className="text-sm text-muted leading-relaxed">
            {line}
          </li>
        ))}
      </ul>
      {tpl && onStartTemplate && c.suggestLabel && (
        <Button
          size="sm"
          variant="soft"
          className="w-full sm:w-auto"
          onClick={() => onStartTemplate(tpl.id, tpl.exerciseIds)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {c.suggestLabel}
        </Button>
      )}
    </Card>
  )
}
