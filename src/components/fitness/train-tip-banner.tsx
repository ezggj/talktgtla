'use client'

type Props = {
  lines: string[]
  suggestedWeightKg?: number
  askLine?: string | null
  askNote?: string | null
  askBusy?: boolean
  onAccept?: () => void
  onIgnore: () => void
  onAsk: () => void
}

/** Short in-flow tip. Not a separate coach screen. */
export function TrainTipBanner({
  lines,
  suggestedWeightKg,
  askLine,
  askNote,
  askBusy,
  onAccept,
  onIgnore,
  onAsk,
}: Props) {
  const canAccept = typeof suggestedWeightKg === 'number' && onAccept
  return (
    <div
      data-testid="train-tip"
      className="rounded-2xl border border-accent/25 bg-accent-soft/40 px-3 py-2.5"
      role="status"
    >
      <div className="text-[10px] font-semibold text-accent">小提示</div>
      {askLine ? (
        <p className="mt-0.5 text-[13px] leading-snug text-foreground" data-testid="train-tip-ask-line">
          {askLine}
        </p>
      ) : (
        <div className="mt-0.5 space-y-0.5">
          {lines.map((line) => (
            <p key={line} className="text-[13px] leading-snug text-foreground">
              {line}
            </p>
          ))}
        </div>
      )}
      {askNote && <p className="mt-1 text-[11px] leading-snug text-muted">{askNote}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {canAccept && (
          <button
            type="button"
            data-testid="train-tip-accept"
            onClick={onAccept}
            className="min-h-[44px] rounded-full bg-accent px-3.5 text-[12px] font-semibold text-white touch-manipulation"
          >
            接受
          </button>
        )}
        <button
          type="button"
          data-testid="train-tip-ignore"
          onClick={onIgnore}
          className="min-h-[44px] rounded-full border border-border bg-surface px-3.5 text-[12px] font-semibold text-muted touch-manipulation"
        >
          忽略
        </button>
        <button
          type="button"
          data-testid="train-tip-ask"
          onClick={onAsk}
          disabled={askBusy}
          className="min-h-[44px] rounded-full border border-accent/30 bg-surface px-3.5 text-[12px] font-semibold text-accent touch-manipulation disabled:opacity-50"
        >
          {askBusy ? '問緊…' : '問 AI'}
        </button>
      </div>
    </div>
  )
}
