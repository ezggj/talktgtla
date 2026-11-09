/**
 * Copy Pose Landmarker wasm + model into public/mediapipe.
 * Runtime loads them from this origin so the CSP connect-src stays 'self'.
 * Side-view clips are what the form check is built for; this script only
 * places the on-device model.
 */
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dest = join(root, 'public', 'mediapipe')
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')

const wasmFiles = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_module_internal.js',
  'vision_wasm_module_internal.wasm',
]

const modelName = 'pose_landmarker_lite.task'
const modelUrl =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

function bigEnough(path) {
  try {
    return statSync(path).size > 500_000
  } catch {
    return false
  }
}

mkdirSync(dest, { recursive: true })

function sameSize(from, to) {
  try {
    const a = statSync(from)
    const b = statSync(to)
    return a.size > 0 && a.size === b.size
  } catch {
    return false
  }
}

for (const name of wasmFiles) {
  const from = join(wasmSrc, name)
  if (!existsSync(from)) {
    console.error(`missing ${from}`)
    console.error('run npm install so @mediapipe/tasks-vision is present')
    process.exit(1)
  }
  const target = join(dest, name)
  if (!sameSize(from, target)) copyFileSync(from, target)
}

const modelPath = join(dest, modelName)
if (!bigEnough(modelPath)) {
  const res = await fetch(modelUrl)
  if (!res.ok) {
    console.error(`pose model download failed: ${res.status} ${modelUrl}`)
    process.exit(1)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 500_000) {
    console.error('pose model looks too small')
    process.exit(1)
  }
  writeFileSync(modelPath, buf)
  console.log(`downloaded ${modelName} (${buf.length} bytes)`)
} else {
  console.log(`${modelName} already present`)
}

console.log(`mediapipe assets ready in ${dest}`)
