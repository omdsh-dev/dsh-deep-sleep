const MINUTE_MS = 60_000;

export const DEFAULT_RECENT_ACTIVITY_MS = 5 * MINUTE_MS;

export type ScheduleStage = "initial" | "nudge" | "plead" | "sleepy";

export const STAGE_THRESHOLDS_MS: Readonly<Record<ScheduleStage, number>> =
  Object.freeze({
    initial: 0,
    nudge: 15 * MINUTE_MS,
    plead: 30 * MINUTE_MS,
    sleepy: 60 * MINUTE_MS,
  });

export const STAGE_COPY: Readonly<Record<ScheduleStage, string>> = Object.freeze({
  initial: "要早点休息了",
  nudge: "已经很晚了，收个尾就去睡吧",
  plead: "真的该休息了，明天再继续吧",
  sleepy: "小猫都困得睁不开眼了，你也该睡了",
});

/** User-facing schedule values, stored as browser-local wall-clock times. */
export interface ScheduleConfig {
  readonly bedtime: string;
  readonly morningCutoff: string;
  readonly recentActivityMs: number;
}

/**
 * Deliberately accepts unknown values because persisted settings can be stale or
 * manually edited. `normalizeScheduleConfig` is the trust boundary.
 */
export interface ScheduleConfigInput {
  readonly bedtime?: unknown;
  readonly morningCutoff?: unknown;
  readonly recentActivityMs?: unknown;
}

export interface NormalizedScheduleConfig extends ScheduleConfig {
  readonly bedtimeMinutes: number;
  readonly morningCutoffMinutes: number;
  readonly crossesMidnight: boolean;
}

export const DEFAULT_SCHEDULE_CONFIG: Readonly<ScheduleConfig> = Object.freeze({
  bedtime: "22:00",
  morningCutoff: "06:00",
  recentActivityMs: DEFAULT_RECENT_ACTIVITY_MS,
});

export type DateLike = Date | number;

export interface NightWindow {
  /** True from bedtime (inclusive) until morning cutoff (exclusive). */
  readonly isActive: boolean;
  /** Local YYYY-MM-DD of the bedtime which owns this night. */
  readonly nightKey: string;
  /** Active window start, or the next bedtime when outside the window. */
  readonly startsAtMs: number;
  /** Cutoff paired with `startsAtMs`. */
  readonly cutoffAtMs: number;
  /** Milliseconds since bedtime, only while the window is active. */
  readonly elapsedMs: number | null;
  readonly crossesMidnight: boolean;
}

export interface ScheduleContext {
  readonly now: DateLike;
  readonly isVisible: boolean;
  readonly isFocused: boolean;
  readonly lastActivityAt: DateLike | null;
  readonly snoozeUntil?: DateLike | null;
  readonly skippedNightKey?: string | null;
}

export type ScheduleSuppressionReason =
  | "outside-window"
  | "skipped"
  | "snoozed"
  | "hidden"
  | "unfocused"
  | "inactive";

export interface ScheduleDecision {
  /** Whether the reminder UI should currently be visible. */
  readonly visible: boolean;
  readonly shouldRemind: boolean;
  readonly stage: ScheduleStage | null;
  readonly message: string | null;
  readonly nightKey: string;
  readonly bedtimeAtMs: number;
  readonly cutoffAtMs: number;
  readonly elapsedMs: number | null;
  readonly window: NightWindow;
  readonly hasRecentActivity: boolean;
  /** Window + visibility + focus + recent activity, before user suppression. */
  readonly isContinuedUse: boolean;
  /** Short alias intended for UI state branching. */
  readonly reason: ScheduleSuppressionReason | null;
  readonly suppressionReason: ScheduleSuppressionReason | null;
}

interface ParsedTime {
  readonly text: string;
  readonly minutes: number;
}

function parseTime(value: unknown): ParsedTime | null {
  if (typeof value !== "string") return null;

  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return {
    text: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    minutes: hours * 60 + minutes,
  };
}

function defaultParsedTimes(): {
  readonly bedtime: ParsedTime;
  readonly cutoff: ParsedTime;
} {
  // These constants are controlled by this module and therefore always parse.
  return {
    bedtime: parseTime(DEFAULT_SCHEDULE_CONFIG.bedtime) as ParsedTime,
    cutoff: parseTime(DEFAULT_SCHEDULE_CONFIG.morningCutoff) as ParsedTime,
  };
}

export function normalizeScheduleConfig(
  input: ScheduleConfigInput | null | undefined = undefined,
): NormalizedScheduleConfig {
  const defaults = defaultParsedTimes();
  let bedtime = parseTime(input?.bedtime) ?? defaults.bedtime;
  let cutoff = parseTime(input?.morningCutoff) ?? defaults.cutoff;

  // Equal endpoints would be either a zero-hour or an accidental 24-hour
  // reminder window. Fall back as a pair instead of guessing which was meant.
  if (bedtime.minutes === cutoff.minutes) {
    bedtime = defaults.bedtime;
    cutoff = defaults.cutoff;
  }

  const requestedActivityMs = input?.recentActivityMs;
  const normalizedActivityMs =
    typeof requestedActivityMs === "number" && Number.isFinite(requestedActivityMs)
      ? Math.trunc(requestedActivityMs)
      : 0;
  const recentActivityMs =
    normalizedActivityMs > 0
      ? normalizedActivityMs
      : DEFAULT_SCHEDULE_CONFIG.recentActivityMs;

  return {
    bedtime: bedtime.text,
    morningCutoff: cutoff.text,
    recentActivityMs,
    bedtimeMinutes: bedtime.minutes,
    morningCutoffMinutes: cutoff.minutes,
    crossesMidnight: bedtime.minutes > cutoff.minutes,
  };
}

function validDate(value: DateLike, label: string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError(`${label} must be a valid Date or epoch timestamp`);
  }
  return date;
}

function optionalEpoch(value: DateLike | null | undefined): number | null {
  if (value == null) return null;
  const epoch = value instanceof Date ? value.getTime() : value;
  return Number.isFinite(epoch) ? epoch : null;
}

function atLocalMinute(base: Date, minuteOfDay: number, dayOffset = 0): Date {
  const date = new Date(base.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
  return date;
}

function formatNightKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Resolves the current or next sleep window using local Date getters/setters.
 * No UTC conversion is used, so a configured 22:00 remains 22:00 in the
 * browser's local wall clock, including across midnight and DST boundaries.
 */
export function deriveNightWindow(
  now: DateLike,
  input?: ScheduleConfigInput | null,
): NightWindow {
  const date = validDate(now, "now");
  const nowMs = date.getTime();
  const config = normalizeScheduleConfig(input);
  const bedtimeToday = atLocalMinute(date, config.bedtimeMinutes);
  const cutoffToday = atLocalMinute(date, config.morningCutoffMinutes);

  let startsAt: Date;
  let cutoffAt: Date;
  let isActive: boolean;

  if (config.crossesMidnight) {
    if (nowMs >= bedtimeToday.getTime()) {
      startsAt = bedtimeToday;
      cutoffAt = atLocalMinute(date, config.morningCutoffMinutes, 1);
      isActive = nowMs < cutoffAt.getTime();
    } else if (nowMs < cutoffToday.getTime()) {
      startsAt = atLocalMinute(date, config.bedtimeMinutes, -1);
      cutoffAt = cutoffToday;
      isActive = true;
    } else {
      startsAt = bedtimeToday;
      cutoffAt = atLocalMinute(date, config.morningCutoffMinutes, 1);
      isActive = false;
    }
  } else if (nowMs < bedtimeToday.getTime()) {
    startsAt = bedtimeToday;
    cutoffAt = cutoffToday;
    isActive = false;
  } else if (nowMs < cutoffToday.getTime()) {
    startsAt = bedtimeToday;
    cutoffAt = cutoffToday;
    isActive = true;
  } else {
    startsAt = atLocalMinute(date, config.bedtimeMinutes, 1);
    cutoffAt = atLocalMinute(date, config.morningCutoffMinutes, 1);
    isActive = false;
  }

  const startsAtMs = startsAt.getTime();
  return {
    isActive,
    nightKey: formatNightKey(startsAt),
    startsAtMs,
    cutoffAtMs: cutoffAt.getTime(),
    elapsedMs: isActive ? nowMs - startsAtMs : null,
    crossesMidnight: config.crossesMidnight,
  };
}

export function deriveStage(elapsedMs: number): ScheduleStage {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  if (elapsed >= STAGE_THRESHOLDS_MS.sleepy) return "sleepy";
  if (elapsed >= STAGE_THRESHOLDS_MS.plead) return "plead";
  if (elapsed >= STAGE_THRESHOLDS_MS.nudge) return "nudge";
  return "initial";
}

function recentActivity(
  nowMs: number,
  lastActivityAt: DateLike | null,
  recentActivityMs: number,
): { readonly isRecent: boolean; readonly expiresAtMs: number | null } {
  const rawActivityAtMs = optionalEpoch(lastActivityAt);
  if (rawActivityAtMs == null) {
    return { isRecent: false, expiresAtMs: null };
  }

  // A tiny forward clock skew should not deactivate the user or extend their
  // active period indefinitely.
  const activityAtMs = Math.min(rawActivityAtMs, nowMs);
  // The activity window includes its exact endpoint. Since epoch timestamps
  // have millisecond precision, the first inactive instant is one ms later.
  const expiresAtMs = activityAtMs + recentActivityMs + 1;
  return { isRecent: nowMs < expiresAtMs, expiresAtMs };
}

export function deriveScheduleDecision(
  context: ScheduleContext,
  input?: ScheduleConfigInput | null,
): ScheduleDecision {
  const nowMs = validDate(context.now, "context.now").getTime();
  const config = normalizeScheduleConfig(input);
  const window = deriveNightWindow(nowMs, config);
  const activity = recentActivity(
    nowMs,
    context.lastActivityAt,
    config.recentActivityMs,
  );
  const isContinuedUse =
    window.isActive &&
    context.isVisible === true &&
    context.isFocused === true &&
    activity.isRecent;

  const snoozeUntilMs = optionalEpoch(context.snoozeUntil);
  let suppressionReason: ScheduleSuppressionReason | null = null;

  if (!window.isActive) {
    suppressionReason = "outside-window";
  } else if (context.skippedNightKey === window.nightKey) {
    suppressionReason = "skipped";
  } else if (snoozeUntilMs != null && snoozeUntilMs > nowMs) {
    suppressionReason = "snoozed";
  } else if (context.isVisible !== true) {
    suppressionReason = "hidden";
  } else if (context.isFocused !== true) {
    suppressionReason = "unfocused";
  } else if (!activity.isRecent) {
    suppressionReason = "inactive";
  }

  const shouldRemind = suppressionReason == null;
  const stage = shouldRemind ? deriveStage(window.elapsedMs ?? 0) : null;

  return {
    visible: shouldRemind,
    shouldRemind,
    stage,
    message: stage == null ? null : STAGE_COPY[stage],
    nightKey: window.nightKey,
    bedtimeAtMs: window.startsAtMs,
    cutoffAtMs: window.cutoffAtMs,
    elapsedMs: window.elapsedMs,
    window,
    hasRecentActivity: activity.isRecent,
    isContinuedUse,
    reason: suppressionReason,
    suppressionReason,
  };
}

function nextStageAt(window: NightWindow, stage: ScheduleStage): number | null {
  switch (stage) {
    case "initial":
      return window.startsAtMs + STAGE_THRESHOLDS_MS.nudge;
    case "nudge":
      return window.startsAtMs + STAGE_THRESHOLDS_MS.plead;
    case "plead":
      return window.startsAtMs + STAGE_THRESHOLDS_MS.sleepy;
    case "sleepy":
      return null;
  }
}

/** Epoch timestamp for the next timer-driven transition. */
export function nextWakeAt(
  context: ScheduleContext,
  input?: ScheduleConfigInput | null,
): number {
  const nowMs = validDate(context.now, "context.now").getTime();
  const config = normalizeScheduleConfig(input);
  const decision = deriveScheduleDecision({ ...context, now: nowMs }, config);
  const { window } = decision;

  if (!window.isActive) return window.startsAtMs;

  const candidates = [window.cutoffAtMs];
  if (decision.suppressionReason === "skipped") {
    return window.cutoffAtMs;
  }

  const snoozeUntilMs = optionalEpoch(context.snoozeUntil);
  if (snoozeUntilMs != null && snoozeUntilMs > nowMs) {
    candidates.push(snoozeUntilMs);
    return Math.min(...candidates);
  }

  if (decision.isContinuedUse && decision.stage != null) {
    const stageAt = nextStageAt(window, decision.stage);
    if (stageAt != null && stageAt > nowMs) candidates.push(stageAt);

    const activity = recentActivity(
      nowMs,
      context.lastActivityAt,
      config.recentActivityMs,
    );
    if (activity.expiresAtMs != null && activity.expiresAtMs > nowMs) {
      candidates.push(activity.expiresAtMs);
    }
  }

  return Math.min(...candidates);
}

/** Milliseconds suitable for `setTimeout` until the next schedule transition. */
export function nextWakeDelay(
  context: ScheduleContext,
  input?: ScheduleConfigInput | null,
): number {
  const nowMs = validDate(context.now, "context.now").getTime();
  return Math.max(0, Math.ceil(nextWakeAt({ ...context, now: nowMs }, input) - nowMs));
}
