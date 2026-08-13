import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export function checkoutPath() {
  const candidates = [
    process.env.DSH_CHECKOUT,
    process.env.DSH_HOME === undefined ? undefined : join(process.env.DSH_HOME, 'source', 'current'),
    join(homedir(), '.dsh', 'source', 'current'),
  ].filter(value => value !== undefined && value !== '')

  for (const value of candidates) {
    const checkout = resolve(value)
    if (existsSync(join(checkout, 'packages', 'client', 'tsdown.client.ts'))) return checkout
  }

  throw new Error(
    'Unable to locate a DSH source checkout. Set DSH_CHECKOUT to the current DSH source directory.',
  )
}

function workspacePackage(checkout, name) {
  const packages = join(checkout, 'packages')
  for (const group of readdirSync(packages, { withFileTypes: true })) {
    if (!group.isDirectory()) continue
    const groupDir = join(packages, group.name)
    for (const entry of readdirSync(groupDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const file = join(groupDir, entry.name, 'package.json')
      if (!existsSync(file)) continue
      try {
        if (JSON.parse(readFileSync(file, 'utf8')).name === name) return join(groupDir, entry.name)
      } catch {}
    }
  }
  return undefined
}

export function withCheckoutModules(root, fn) {
  const checkout = checkoutPath()
  const modules = join(root, 'node_modules')
  if (!existsSync(modules)) throw new Error('node_modules is missing; run `pnpm install` first')
  const created = []
  try {
    const scope = join(modules, '@deepseek-ai')
    mkdirSync(scope, { recursive: true })
    for (const name of [
      '@deepseek-ai/dsh-client-runtime',
      '@deepseek-ai/dsh-client-ui-slots',
      '@deepseek-ai/dsh-client-ui-conversation',
    ]) {
      const target = join(scope, name.slice(name.lastIndexOf('/') + 1))
      if (existsSync(target)) continue
      const source = workspacePackage(checkout, name)
      if (source === undefined) throw new Error(`workspace package not found: ${name}`)
      symlinkSync(source, target, 'dir')
      created.push(target)
    }
    return fn(checkout)
  } finally {
    for (const target of created.reverse()) rmSync(target, { force: true })
  }
}
