export declare const STORAGE_KEY = "dsh-deep-sleep/preferences-v1";
export interface SleepPreferences {
    readonly snoozeUntil?: number;
    readonly skippedNightKey?: string;
}
export declare function parsePreferences(raw: string | null): SleepPreferences;
export declare function readPreferences(storage?: Pick<Storage, 'getItem'>): SleepPreferences;
export declare function writePreferences(preferences: SleepPreferences, storage?: Pick<Storage, 'setItem'>): void;
//# sourceMappingURL=storage.d.ts.map