'use client'

import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { saveTrainTipsEnabled, useTrainTipsEnabled } from '@/lib/fitness/train-tips-prefs'
import { cn } from '@/lib/utils'

export function TrainTipsCard() {
  const on = useTrainTipsEnabled()

  return (
    <Card className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-lg">訓練小提示</CardTitle>
          <CardDesc className="mt-1">
            開波、記完一組、完場會講一兩句，用你部機嘅訓練紀錄計。預設開住。想再問多句先撳「問
            AI」，每日 3 次。
          </CardDesc>
          {!on && (
            <p className="mt-1.5 text-[12px] text-muted">關咗。開波、記組、完場都唔會出小提示。</p>
          )}
        </div>
        <button
          type="button"
          data-testid="train-tips-toggle"
          onClick={() => saveTrainTipsEnabled(!on)}
          className={cn(
            'shrink-0 inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold touch-manipulation',
            on ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted'
          )}
          aria-pressed={on}
        >
          {on ? '開' : '關'}
        </button>
      </div>
    </Card>
  )
}
