import type { PoseLandmark } from './form-check'

export type PoseDelegate = 'GPU' | 'CPU'

export type PoseDetector = {
  detect(video: HTMLVideoElement, timestampMs: number): PoseLandmark[] | null
  close(): void
}

export type PoseEngine = {
  readonly delegate: PoseDelegate
  detect(video: HTMLVideoElement, timestampMs: number): Promise<PoseLandmark[] | null>
  close(): void
}

export const MEDIAPIPE_WASM_BASE = '/mediapipe'
export const MEDIAPIPE_MODEL_PATH = '/mediapipe/pose_landmarker_lite.task'

/**
 * Try GPU first. If creating the landmarker throws, or the first detect throws,
 * rebuild on CPU. Timestamps stay monotonic for a single landmarker instance.
 */
export async function startPoseEngine(
  create: (delegate: PoseDelegate) => Promise<PoseDetector>
): Promise<PoseEngine> {
  let delegate: PoseDelegate = 'GPU'
  let detector: PoseDetector
  try {
    detector = await create('GPU')
  } catch {
    delegate = 'CPU'
    detector = await create('CPU')
  }
  let fellBack = delegate === 'CPU'
  let lastTs = -1

  const bump = (timestampMs: number) => {
    let ts = Math.round(timestampMs)
    if (ts <= lastTs) ts = lastTs + 1
    lastTs = ts
    return ts
  }

  return {
    get delegate() {
      return delegate
    },
    async detect(video, timestampMs) {
      const ts = bump(timestampMs)
      try {
        return detector.detect(video, ts)
      } catch (err) {
        if (fellBack) throw err
        fellBack = true
        try {
          detector.close()
        } catch {
          /* already gone */
        }
        delegate = 'CPU'
        detector = await create('CPU')
        lastTs = -1
        const retry = bump(timestampMs)
        return detector.detect(video, retry)
      }
    },
    close() {
      try {
        detector.close()
      } catch {
        /* already gone */
      }
    },
  }
}

function gpuCanvas(): HTMLCanvasElement | undefined {
  if (typeof document === 'undefined') return undefined
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas
}

export async function openPoseEngine(): Promise<PoseEngine> {
  return startPoseEngine(async (delegate) => {
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE)
    const landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MEDIAPIPE_MODEL_PATH,
        delegate,
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      ...(delegate === 'GPU' ? { canvas: gpuCanvas() } : {}),
    })
    return {
      detect(video, timestampMs) {
        const result = landmarker.detectForVideo(video, timestampMs)
        const row = result.landmarks?.[0]
        if (!row || row.length < 29) return null
        return row.map((point) => ({
          x: point.x,
          y: point.y,
          z: point.z,
          visibility: point.visibility,
        }))
      },
      close() {
        landmarker.close()
      },
    }
  })
}
