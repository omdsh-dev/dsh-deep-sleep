export const STORAGE_KEY = 'dsh-deep-sleep/preferences-v1'

export interface SleepPreferences {
  readonly snoozeUntil?: number
  readonly skippedNightKey?: string
}

export function parsePreferences(raw: string | null): SleepPreferences {
  if (raw === null) return {}
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    return {
      ...(typeof value.snoozeUntil === 'number' && Number.isFinite(value.snoozeUntil)
        ? { snoozeUntil: value.snoozeUntil }
        : {}),
      ...(typeof value.skippedNightKey === 'string'
        ? { skippedNightKey: value.skippedNightKey }
        : {}),
    }
  } catch {
    return {}
  }
}

function browserStorage(): Pick<Storage, 'getItem' | 'setItem'> | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

export function readPreferences(storage?: Pick<Storage, 'getItem'>): SleepPreferences {
  const target = storage ?? browserStorage()
  if (target === undefined) return {}
  try {
    return parsePreferences(target.getItem(STORAGE_KEY))
  } catch {
    return {}
  }
}

export function writePreferences(
  preferences: SleepPreferences,
  storage?: Pick<Storage, 'setItem'>,
): void {
  const target = storage ?? browserStorage()
  if (target === undefined) return
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Storage can be denied by browser privacy policy. The component still
    // keeps the preference in memory for the current page lifetime.
  }
}
