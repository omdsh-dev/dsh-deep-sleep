import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { DeepSleepCat } from './DeepSleepCat.tsx'

export const inject = ['slots']

/** Register the reminder into DSH's official session-header action slot. */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject(
    'conversation.session.header.actions',
    () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'deep-sleep-cat',
      order: 100,
    }, DeepSleepCat),
  )
}
