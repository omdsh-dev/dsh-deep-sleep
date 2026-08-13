import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { CAT_SPRITE_DATA_URI } from './cat-sprite.generated.ts'
import {
  DEFAULT_SCHEDULE_CONFIG,
  deriveScheduleDecision,
  nextWakeDelay,
  type ScheduleDecision,
} from './schedule.ts'
import { readPreferences, STORAGE_KEY, writePreferences, type SleepPreferences } from './storage.ts'
import css from './DeepSleepCat.module.css'

export type DeepSleepCatProps = PropsRuntime<'conversation.session.header.actions'>

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
const SNOOZE_MS = 15 * 60_000
const MAX_TIMER_MS = 2_147_000_000

function focused(): boolean {
  return typeof document.hasFocus === 'function' ? document.hasFocus() : true
}

function decisionAt(now: number, lastActivityAt: number, preferences: SleepPreferences): ScheduleDecision {
  return deriveScheduleDecision({
    now,
    isVisible: document.visibilityState === 'visible',
    isFocused: focused(),
    lastActivityAt,
    snoozeUntil: preferences.snoozeUntil,
    skippedNightKey: preferences.skippedNightKey,
  }, DEFAULT_SCHEDULE_CONFIG)
}

/** Header mascot and browser-local bedtime interaction. */
export function DeepSleepCat(_props: DeepSleepCatProps) {
  const mountedAt = useMemo(() => Date.now(), [])
  const lastActivityRef = useRef(mountedAt)
  const preferencesRef = useRef<Readonly<SleepPreferences>>(readPreferences())
  const [decision, setDecision] = useState(() => decisionAt(mountedAt, mountedAt, preferencesRef.current))
  const [open, setOpen] = useState(() => decision.visible)
  const previousVisible = useRef(decision.visible)

  const refresh = useCallback((now = Date.now()) => {
    setDecision(decisionAt(now, lastActivityRef.current, preferencesRef.current))
  }, [])

  useEffect(() => {
    const activity = () => {
      lastActivityRef.current = Date.now()
      refresh()
    }
    const environment = () => { refresh() }
    const storage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      preferencesRef.current = readPreferences()
      refresh()
    }
    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, activity, { passive: true })
    window.addEventListener('focus', environment)
    window.addEventListener('blur', environment)
    window.addEventListener('storage', storage)
    document.addEventListener('visibilitychange', environment)
    return () => {
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, activity)
      window.removeEventListener('focus', environment)
      window.removeEventListener('blur', environment)
      window.removeEventListener('storage', storage)
      document.removeEventListener('visibilitychange', environment)
    }
  }, [refresh])

  useEffect(() => {
    const context = {
      now: Date.now(),
      isVisible: document.visibilityState === 'visible',
      isFocused: focused(),
      lastActivityAt: lastActivityRef.current,
      snoozeUntil: preferencesRef.current.snoozeUntil,
      skippedNightKey: preferencesRef.current.skippedNightKey,
    }
    const delay = Math.min(MAX_TIMER_MS, Math.max(250, nextWakeDelay(context, DEFAULT_SCHEDULE_CONFIG)))
    const timer = window.setTimeout(() => { refresh() }, delay)
    return () => { window.clearTimeout(timer) }
  }, [decision, refresh])

  useEffect(() => {
    if (decision.visible && !previousVisible.current) setOpen(true)
    if (!decision.visible) setOpen(false)
    previousVisible.current = decision.visible
  }, [decision.visible])

  const save = (preferences: SleepPreferences): void => {
    preferencesRef.current = preferences
    writePreferences(preferences)
    refresh()
  }

  const snooze = (): void => {
    save({ ...preferencesRef.current, snoozeUntil: Date.now() + SNOOZE_MS })
  }

  const skipTonight = (): void => {
    save({ ...preferencesRef.current, snoozeUntil: undefined, skippedNightKey: decision.nightKey })
  }

  const stage = decision.stage ?? 'initial'
  return (
    <div
      className={css.root}
      data-deep-sleep-cat
      data-visible={decision.visible}
      data-open={decision.visible && open}
      data-stage={stage}
      style={{ '--deep-sleep-cat-sprite': `url(${CAT_SPRITE_DATA_URI})` } as React.CSSProperties}
    >
      <button
        type="button"
        className={css.catButton}
        aria-label={decision.visible ? `猫猫提醒：${decision.message ?? ''}` : '猫猫早睡提醒'}
        aria-expanded={decision.visible ? open : undefined}
        disabled={!decision.visible}
        onClick={() => { if (decision.visible) setOpen(value => !value) }}
      >
        <span className={css.sprite} aria-hidden="true" />
      </button>
      {decision.visible && (
        <section
          className={css.bubble}
          aria-label="猫猫早睡提醒"
          aria-hidden={!open}
        >
          <div role="status" aria-live="polite">
            <strong className={css.title}>夜深啦</strong>
            <p className={css.message}>{decision.message}</p>
          </div>
          <div className={css.actions}>
            <button type="button" tabIndex={open ? 0 : -1} className={css.action} onClick={skipTonight}>今晚不再提醒</button>
            <button type="button" tabIndex={open ? 0 : -1} className={`${css.action} ${css.snooze}`} onClick={snooze}>15 分钟后</button>
          </div>
        </section>
      )}
    </div>
  )
}
