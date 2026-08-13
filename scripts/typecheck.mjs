import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { withCheckoutModules } from './workspace.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
withCheckoutModules(root, checkout => {
  const result = spawnSync(join(root, 'node_modules', '.bin', 'tsc'), [
    '-p', 'tsconfig.json', '--noEmit', '--pretty', 'false',
  ], { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`Typecheck failed with exit code ${String(result.status)}`)
})
