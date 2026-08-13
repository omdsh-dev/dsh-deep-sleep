export declare const DEFAULT_RECENT_ACTIVITY_MS: number;
export type ScheduleStage = "initial" | "nudge" | "plead" | "sleepy";
export declare const STAGE_THRESHOLDS_MS: Readonly<Record<ScheduleStage, number>>;
export declare const STAGE_COPY: Readonly<Record<ScheduleStage, string>>;
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
export declare const DEFAULT_SCHEDULE_CONFIG: Readonly<ScheduleConfig>;
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
export type ScheduleSuppressionReason = "outside-window" | "skipped" | "snoozed" | "hidden" | "unfocused" | "inactive";
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
export declare function normalizeScheduleConfig(input?: ScheduleConfigInput | null | undefined): NormalizedScheduleConfig;
/**
 * Resolves the current or next sleep window using local Date getters/setters.
 * No UTC conversion is used, so a configured 22:00 remains 22:00 in the
 * browser's local wall clock, including across midnight and DST boundaries.
 */
export declare function deriveNightWindow(now: DateLike, input?: ScheduleConfigInput | null): NightWindow;
export declare function deriveStage(elapsedMs: number): ScheduleStage;
export declare function deriveScheduleDecision(context: ScheduleContext, input?: ScheduleConfigInput | null): ScheduleDecision;
/** Epoch timestamp for the next timer-driven transition. */
export declare function nextWakeAt(context: ScheduleContext, input?: ScheduleConfigInput | null): number;
/** Milliseconds suitable for `setTimeout` until the next schedule transition. */
export declare function nextWakeDelay(context: ScheduleContext, input?: ScheduleConfigInput | null): number;
//# sourceMappingURL=schedule.d.ts.map