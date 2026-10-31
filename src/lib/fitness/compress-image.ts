/** Client-side: shrink meal photos before AI upload (cost + latency). */

export type CompressedImage = {
  blob: Blob
  dataUrl: string
  mediaType: 'image/jpeg' | 'image/webp'
  width: number
  height: number
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('讀唔到相片'))
    }
    img.src = url
  })
}

/**
 * Resize longest side to `maxEdge`, JPEG quality ~0.72.
 * Keeps under ~900KB for typical phone photos.
 */
export async function compressMealImage(
  file: File | Blob,
  opts?: { maxEdge?: number; quality?: number }
): Promise<CompressedImage> {
  const maxEdge = opts?.maxEdge ?? 1280
  const quality = opts?.quality ?? 0.72
  const img = await loadImage(file)
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 唔支援')
  ctx.drawImage(img, 0, 0, width, height)

  const mediaType: 'image/jpeg' = 'image/jpeg'
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('壓縮失敗'))),
      mediaType,
      quality
    )
  })
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('讀壓縮圖失敗'))
    reader.readAsDataURL(blob)
  })

  return { blob, dataUrl, mediaType, width, height }
}
