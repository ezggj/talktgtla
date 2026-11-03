/** Plan exercise queue helpers — next move in template order. */

/** Next exercise after the selected one in plan order (no wrap). */
export function nextPlanExerciseId(
  queue: string[],
  selectedId: string | null | undefined
): string | null {
  if (!queue.length) return null
  if (!selectedId) return queue[0] ?? null
  const idx = queue.indexOf(selectedId)
  if (idx >= 0) {
    for (let i = idx + 1; i < queue.length; i++) {
      if (queue[i] && queue[i] !== selectedId) return queue[i]
    }
    return null
  }
  return queue.find((id) => id !== selectedId) ?? null
}

/**
 * When a template is running, offer jumping to the next move.
 * Emphasize after enough sets on the current lift (default 3).
 */
export function offerNextPlanExercise(opts: {
  queue: string[]
  selectedId: string | null | undefined
  setsForSelected: number
  minSets?: number
}): { nextId: string; emphasize: boolean } | null {
  const nextId = nextPlanExerciseId(opts.queue, opts.selectedId)
  if (!nextId) return null
  const min = opts.minSets ?? 3
  return {
    nextId,
    emphasize: opts.setsForSelected >= min,
  }
}
