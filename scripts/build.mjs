import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { withCheckoutModules } from './workspace.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
rmSync(join(root, 'lib'), { recursive: true, force: true })

withCheckoutModules(root, checkout => {
  const bin = join(root, 'node_modules', '.bin')
  const tsc = spawnSync(join(bin, 'tsc'), [
    '-p', 'tsconfig.build.json',
  ], { cwd: root, stdio: 'inherit', env: { ...process.env, DSH_CHECKOUT: checkout } })
  if (tsc.status !== 0) throw new Error(`TypeScript build failed with exit code ${String(tsc.status)}`)
  const build = spawnSync(join(bin, 'tsdown'), ['-c', 'tsdown.config.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DSH_CHECKOUT: checkout },
  })
  if (build.status !== 0) throw new Error(`Client bundle build failed with exit code ${String(build.status)}`)

  // Rolldown prints virtual CSS module ids into region comments. Rebase the
  // physical project root so distributable bundles never expose a developer's
  // absolute workspace path. This changes comments only; sourcemap mappings
  // and executable offsets stay line-for-line intact.
  const clientFile = join(root, 'lib', 'client.js')
  const clientSource = readFileSync(clientFile, 'utf8')
  const portableRoot = root.replaceAll('\\', '/')
  const sanitized = clientSource.replaceAll(`\\0dsh-css:${portableRoot}/`, '\\0dsh-css:')
  if (sanitized.includes(portableRoot)) {
    throw new Error('client bundle still contains the local project path after sanitization')
  }
  writeFileSync(clientFile, sanitized)
})
