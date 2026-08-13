import { describe, expect, it } from "vitest";

import {
  DEFAULT_RECENT_ACTIVITY_MS,
  DEFAULT_SCHEDULE_CONFIG,
  STAGE_COPY,
  deriveNightWindow,
  deriveScheduleDecision,
  deriveStage,
  nextWakeDelay,
  normalizeScheduleConfig,
  type ScheduleContext,
} from "../src/client/schedule";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

function localDate(
  day: number,
  hours: number,
  minutes = 0,
  seconds = 0,
  milliseconds = 0,
): Date {
  return new Date(2026, 7, day, hours, minutes, seconds, milliseconds);
}

function activeContext(now: Date): ScheduleContext {
  return {
    now,
    isVisible: true,
    isFocused: true,
    lastActivityAt: new Date(now.getTime() - MINUTE_MS),
  };
}

describe("normalizeScheduleConfig", () => {
  it("provides the local-wall-clock defaults", () => {
    expect(normalizeScheduleConfig()).toMatchObject({
      bedtime: "22:00",
      morningCutoff: "06:00",
      recentActivityMs: DEFAULT_RECENT_ACTIVITY_MS,
      crossesMidnight: true,
    });
  });

  it("normalizes valid values", () => {
    expect(
      normalizeScheduleConfig({
        bedtime: " 9:05 ",
        morningCutoff: "11:30",
        recentActivityMs: 90_000.9,
      }),
    ).toEqual({
      bedtime: "09:05",
      morningCutoff: "11:30",
      recentActivityMs: 90_000,
      bedtimeMinutes: 9 * 60 + 5,
      morningCutoffMinutes: 11 * 60 + 30,
      crossesMidnight: false,
    });
  });

  it("falls back for invalid or equal endpoints and invalid activity windows", () => {
    expect(
      normalizeScheduleConfig({
        bedtime: "25:99",
        morningCutoff: "not-a-time",
        recentActivityMs: -1,
      }),
    ).toMatchObject(DEFAULT_SCHEDULE_CONFIG);

    expect(
      normalizeScheduleConfig({ bedtime: "08:00", morningCutoff: "08:00" }),
    ).toMatchObject({ bedtime: "22:00", morningCutoff: "06:00" });

    expect(normalizeScheduleConfig({ recentActivityMs: 0.5 })).toMatchObject({
      recentActivityMs: DEFAULT_RECENT_ACTIVITY_MS,
    });
  });
});

describe("deriveNightWindow", () => {
  it("is inactive at 21:59 and starts exactly at 22:00", () => {
    const before = deriveNightWindow(localDate(13, 21, 59));
    expect(before).toMatchObject({
      isActive: false,
      nightKey: "2026-08-13",
      elapsedMs: null,
    });
    expect(before.startsAtMs).toBe(localDate(13, 22).getTime());

    const start = deriveNightWindow(localDate(13, 22));
    expect(start).toMatchObject({
      isActive: true,
      nightKey: "2026-08-13",
      elapsedMs: 0,
    });
  });

  it("attributes times after midnight to the previous bedtime", () => {
    const window = deriveNightWindow(localDate(14, 0, 30));
    expect(window).toMatchObject({
      isActive: true,
      nightKey: "2026-08-13",
      elapsedMs: 2.5 * HOUR_MS,
    });
    expect(window.startsAtMs).toBe(localDate(13, 22).getTime());
    expect(window.cutoffAtMs).toBe(localDate(14, 6).getTime());
  });

  it("excludes the morning cutoff and targets the upcoming night", () => {
    const window = deriveNightWindow(localDate(14, 6));
    expect(window).toMatchObject({
      isActive: false,
      nightKey: "2026-08-14",
      elapsedMs: null,
    });
    expect(window.startsAtMs).toBe(localDate(14, 22).getTime());
  });
});

describe("deriveStage", () => {
  it.each([
    [0, "initial"],
    [15 * MINUTE_MS - 1, "initial"],
    [15 * MINUTE_MS, "nudge"],
    [30 * MINUTE_MS - 1, "nudge"],
    [30 * MINUTE_MS, "plead"],
    [60 * MINUTE_MS - 1, "plead"],
    [60 * MINUTE_MS, "sleepy"],
  ] as const)("maps %i ms to %s", (elapsedMs, stage) => {
    expect(deriveStage(elapsedMs)).toBe(stage);
  });
});

describe("deriveScheduleDecision", () => {
  it("shows the exact initial copy at bedtime for continued use", () => {
    const decision = deriveScheduleDecision(activeContext(localDate(13, 22)));
    expect(decision).toMatchObject({
      visible: true,
      shouldRemind: true,
      stage: "initial",
      message: "要早点休息了",
      isContinuedUse: true,
      reason: null,
      suppressionReason: null,
    });
    expect(STAGE_COPY.initial).toBe("要早点休息了");
  });

  it.each([
    [{ isVisible: false }, "hidden"],
    [{ isFocused: false }, "unfocused"],
    [{ lastActivityAt: localDate(13, 21) }, "inactive"],
  ] as const)("does not count non-active use: %o", (overrides, reason) => {
    const decision = deriveScheduleDecision({
      ...activeContext(localDate(13, 22, 20)),
      ...overrides,
    });
    expect(decision).toMatchObject({
      visible: false,
      shouldRemind: false,
      stage: null,
      message: null,
      isContinuedUse: false,
      suppressionReason: reason,
    });
  });

  it("includes the exact five-minute activity boundary", () => {
    const now = localDate(13, 22, 20);
    const decision = deriveScheduleDecision({
      ...activeContext(now),
      lastActivityAt: new Date(now.getTime() - DEFAULT_RECENT_ACTIVITY_MS),
    });

    expect(decision).toMatchObject({
      visible: true,
      shouldRemind: true,
      hasRecentActivity: true,
      isContinuedUse: true,
    });
  });

  it("suppresses until snooze expiry and then resumes at the wall-clock stage", () => {
    const now = localDate(13, 22, 20);
    const snoozed = deriveScheduleDecision({
      ...activeContext(now),
      snoozeUntil: localDate(13, 22, 25),
    });
    expect(snoozed).toMatchObject({
      shouldRemind: false,
      stage: null,
      suppressionReason: "snoozed",
    });

    const resumed = deriveScheduleDecision({
      ...activeContext(localDate(13, 22, 25)),
      snoozeUntil: localDate(13, 22, 25),
    });
    expect(resumed).toMatchObject({
      shouldRemind: true,
      stage: "nudge",
      suppressionReason: null,
    });
  });

  it("skips only the matching cross-midnight nightKey", () => {
    const afterMidnight = activeContext(localDate(14, 0, 30));
    expect(
      deriveScheduleDecision({
        ...afterMidnight,
        skippedNightKey: "2026-08-13",
      }),
    ).toMatchObject({
      shouldRemind: false,
      nightKey: "2026-08-13",
      suppressionReason: "skipped",
    });

    expect(
      deriveScheduleDecision({
        ...afterMidnight,
        skippedNightKey: "2026-08-14",
      }),
    ).toMatchObject({ shouldRemind: true, stage: "sleepy" });
  });

  it("upgrades stages based on elapsed local wall-clock time", () => {
    expect(deriveScheduleDecision(activeContext(localDate(13, 22, 15))).stage).toBe(
      "nudge",
    );
    expect(deriveScheduleDecision(activeContext(localDate(13, 22, 30))).stage).toBe(
      "plead",
    );
    expect(deriveScheduleDecision(activeContext(localDate(13, 23))).stage).toBe(
      "sleepy",
    );
  });
});

describe("nextWakeDelay", () => {
  it("wakes at bedtime while outside the window", () => {
    expect(nextWakeDelay(activeContext(localDate(13, 21, 59)))).toBe(MINUTE_MS);
  });

  it("chooses the next stage when activity remains recent", () => {
    const now = localDate(13, 22);
    expect(
      nextWakeDelay(activeContext(now), { recentActivityMs: 2 * HOUR_MS }),
    ).toBe(15 * MINUTE_MS);
  });

  it("chooses snooze expiry ahead of later schedule transitions", () => {
    const now = localDate(13, 22, 20);
    expect(
      nextWakeDelay({
        ...activeContext(now),
        snoozeUntil: localDate(13, 22, 23),
      }),
    ).toBe(3 * MINUTE_MS);
  });

  it("moves one millisecond past the inclusive activity boundary without looping", () => {
    const now = localDate(13, 22, 20);
    expect(
      nextWakeDelay({
        ...activeContext(now),
        lastActivityAt: new Date(now.getTime() - DEFAULT_RECENT_ACTIVITY_MS),
      }),
    ).toBe(1);
  });
});
