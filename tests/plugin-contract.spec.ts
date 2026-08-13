import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import { CAT_SPRITE_DATA_URI } from '../src/client/cat-sprite.generated.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('DSH Profile Bundle contract', () => {
  it('declares the current bundle patch and Web client face', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(manifest.dsh).toEqual({
      bundle: { patch: './cordis.patch.yml' },
      client: {
        platform: 'web',
        inject: [
          '@deepseek-ai/dsh-client-runtime',
          '@deepseek-ai/dsh-client-ui-conversation',
        ],
      },
    })
    expect(manifest.exports['./client'].default).toBe('./lib/client.js')
    expect(readFileSync(join(root, 'cordis.patch.yml'), 'utf8'))
      .toContain("name: '@dsh-external/dsh-deep-sleep'")
  })

  it('registers one cat in the official session-header action slot', () => {
    const dispose = vi.fn()
    const register = vi.fn(() => dispose)
    const slotInject = vi.fn((_name: string, callback: () => () => void) => callback())
    apply({ slots: { inject: slotInject, register } } as never)

    expect(inject).toEqual(['slots'])
    expect(slotInject).toHaveBeenCalledWith(
      'conversation.session.header.actions',
      expect.any(Function),
    )
    expect(register).toHaveBeenCalledWith(
      {
        name: 'conversation.session.header.actions',
        id: 'deep-sleep-cat',
        order: 100,
      },
      expect.any(Function),
    )
  })

  it('embeds the generated transparent cat sheet into the client source', () => {
    expect(CAT_SPRITE_DATA_URI.startsWith('data:image/webp;base64,UklGR')).toBe(true)
    expect(CAT_SPRITE_DATA_URI.length).toBeGreaterThan(200_000)
  })
})
