export const STORAGE_KEY = 'dsh-deep-sleep/preferences-v1';
export function parsePreferences(raw) {
    if (raw === null)
        return {};
    try {
        const value = JSON.parse(raw);
        return {
            ...(typeof value.snoozeUntil === 'number' && Number.isFinite(value.snoozeUntil)
                ? { snoozeUntil: value.snoozeUntil }
                : {}),
            ...(typeof value.skippedNightKey === 'string'
                ? { skippedNightKey: value.skippedNightKey }
                : {}),
        };
    }
    catch {
        return {};
    }
}
function browserStorage() {
    if (typeof window === 'undefined')
        return undefined;
    try {
        return window.localStorage;
    }
    catch {
        return undefined;
    }
}
export function readPreferences(storage) {
    const target = storage ?? browserStorage();
    if (target === undefined)
        return {};
    try {
        return parsePreferences(target.getItem(STORAGE_KEY));
    }
    catch {
        return {};
    }
}
export function writePreferences(preferences, storage) {
    const target = storage ?? browserStorage();
    if (target === undefined)
        return;
    try {
        target.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
    catch {
        // Storage can be denied by browser privacy policy. The component still
        // keeps the preference in memory for the current page lifetime.
    }
}
