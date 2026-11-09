/**
 * Let `node --test` load the repo's TypeScript.
 * Maps extensionless relative imports and the `@/` alias onto src/.
 */
import { existsSync, statSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const exts = ['.ts', '.tsx', '.mts', '.js', '.mjs']

function resolveFile(basePath) {
  if (existsSync(basePath)) {
    const info = statSync(basePath)
    if (info.isFile()) return basePath
    if (info.isDirectory()) {
      for (const ext of exts) {
        const index = join(basePath, `index${ext}`)
        if (existsSync(index)) return index
      }
    }
  }
  for (const ext of exts) {
    if (existsSync(basePath + ext)) return basePath + ext
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const file = resolveFile(join(root, 'src', specifier.slice(2)))
      if (file) return nextResolve(pathToFileURL(file).href, context)
    }
    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      !/\.[cm]?[jt]sx?$/.test(specifier)
    ) {
      const parent = context.parentURL ? fileURLToPath(context.parentURL) : root
      const file = resolveFile(join(dirname(parent), specifier))
      if (file) return nextResolve(pathToFileURL(file).href, context)
    }
    return nextResolve(specifier, context)
  },
})
