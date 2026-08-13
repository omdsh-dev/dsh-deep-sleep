import { describe, expect, it } from 'vitest'
import { parsePreferences, readPreferences, STORAGE_KEY, writePreferences } from '../src/client/storage.ts'

describe('sleep preferences', () => {
  it('treats missing, malformed, and wrongly typed data as empty', () => {
    expect(parsePreferences(null)).toEqual({})
    expect(parsePreferences('{')).toEqual({})
    expect(parsePreferences('{"snoozeUntil":"later","skippedNightKey":4}')).toEqual({})
  })

  it('keeps only finite snooze timestamps and string night keys', () => {
    expect(parsePreferences('{"snoozeUntil":42,"skippedNightKey":"2026-08-13","extra":true}'))
      .toEqual({ snoozeUntil: 42, skippedNightKey: '2026-08-13' })
    expect(parsePreferences('{"snoozeUntil":1e999}')).toEqual({})
  })

  it('reads and writes through the supplied storage boundary', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
    }
    writePreferences({ snoozeUntil: 10 }, storage)
    expect(values.get(STORAGE_KEY)).toBe('{"snoozeUntil":10}')
    expect(readPreferences(storage)).toEqual({ snoozeUntil: 10 })
  })

  it('degrades safely when browser storage is denied', () => {
    const denied = {
      getItem: () => { throw new DOMException('denied', 'SecurityError') },
      setItem: () => { throw new DOMException('denied', 'SecurityError') },
    }
    expect(readPreferences(denied)).toEqual({})
    expect(() => { writePreferences({ snoozeUntil: 10 }, denied) }).not.toThrow()
  })
})
