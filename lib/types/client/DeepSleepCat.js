import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CAT_SPRITE_DATA_URI } from "./cat-sprite.generated.js";
import { DEFAULT_SCHEDULE_CONFIG, deriveScheduleDecision, nextWakeDelay, } from "./schedule.js";
import { readPreferences, STORAGE_KEY, writePreferences } from "./storage.js";
import css from './DeepSleepCat.module.css';
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
const SNOOZE_MS = 15 * 60_000;
const MAX_TIMER_MS = 2_147_000_000;
function focused() {
    return typeof document.hasFocus === 'function' ? document.hasFocus() : true;
}
function decisionAt(now, lastActivityAt, preferences) {
    return deriveScheduleDecision({
        now,
        isVisible: document.visibilityState === 'visible',
        isFocused: focused(),
        lastActivityAt,
        snoozeUntil: preferences.snoozeUntil,
        skippedNightKey: preferences.skippedNightKey,
    }, DEFAULT_SCHEDULE_CONFIG);
}
/** Header mascot and browser-local bedtime interaction. */
export function DeepSleepCat(_props) {
    const mountedAt = useMemo(() => Date.now(), []);
    const lastActivityRef = useRef(mountedAt);
    const preferencesRef = useRef(readPreferences());
    const [decision, setDecision] = useState(() => decisionAt(mountedAt, mountedAt, preferencesRef.current));
    const [open, setOpen] = useState(() => decision.visible);
    const previousVisible = useRef(decision.visible);
    const refresh = useCallback((now = Date.now()) => {
        setDecision(decisionAt(now, lastActivityRef.current, preferencesRef.current));
    }, []);
    useEffect(() => {
        const activity = () => {
            lastActivityRef.current = Date.now();
            refresh();
        };
        const environment = () => { refresh(); };
        const storage = (event) => {
            if (event.key !== STORAGE_KEY)
                return;
            preferencesRef.current = readPreferences();
            refresh();
        };
        for (const type of ACTIVITY_EVENTS)
            window.addEventListener(type, activity, { passive: true });
        window.addEventListener('focus', environment);
        window.addEventListener('blur', environment);
        window.addEventListener('storage', storage);
        document.addEventListener('visibilitychange', environment);
        return () => {
            for (const type of ACTIVITY_EVENTS)
                window.removeEventListener(type, activity);
            window.removeEventListener('focus', environment);
            window.removeEventListener('blur', environment);
            window.removeEventListener('storage', storage);
            document.removeEventListener('visibilitychange', environment);
        };
    }, [refresh]);
    useEffect(() => {
        const context = {
            now: Date.now(),
            isVisible: document.visibilityState === 'visible',
            isFocused: focused(),
            lastActivityAt: lastActivityRef.current,
            snoozeUntil: preferencesRef.current.snoozeUntil,
            skippedNightKey: preferencesRef.current.skippedNightKey,
        };
        const delay = Math.min(MAX_TIMER_MS, Math.max(250, nextWakeDelay(context, DEFAULT_SCHEDULE_CONFIG)));
        const timer = window.setTimeout(() => { refresh(); }, delay);
        return () => { window.clearTimeout(timer); };
    }, [decision, refresh]);
    useEffect(() => {
        if (decision.visible && !previousVisible.current)
            setOpen(true);
        if (!decision.visible)
            setOpen(false);
        previousVisible.current = decision.visible;
    }, [decision.visible]);
    const save = (preferences) => {
        preferencesRef.current = preferences;
        writePreferences(preferences);
        refresh();
    };
    const snooze = () => {
        save({ ...preferencesRef.current, snoozeUntil: Date.now() + SNOOZE_MS });
    };
    const skipTonight = () => {
        save({ ...preferencesRef.current, snoozeUntil: undefined, skippedNightKey: decision.nightKey });
    };
    const stage = decision.stage ?? 'initial';
    return (_jsxs("div", { className: css.root, "data-deep-sleep-cat": true, "data-visible": decision.visible, "data-open": decision.visible && open, "data-stage": stage, style: { '--deep-sleep-cat-sprite': `url(${CAT_SPRITE_DATA_URI})` }, children: [_jsx("button", { type: "button", className: css.catButton, "aria-label": decision.visible ? `猫猫提醒：${decision.message ?? ''}` : '猫猫早睡提醒', "aria-expanded": decision.visible ? open : undefined, disabled: !decision.visible, onClick: () => { if (decision.visible)
                    setOpen(value => !value); }, children: _jsx("span", { className: css.sprite, "aria-hidden": "true" }) }), decision.visible && (_jsxs("section", { className: css.bubble, "aria-label": "\u732B\u732B\u65E9\u7761\u63D0\u9192", "aria-hidden": !open, children: [_jsxs("div", { role: "status", "aria-live": "polite", children: [_jsx("strong", { className: css.title, children: "\u591C\u6DF1\u5566" }), _jsx("p", { className: css.message, children: decision.message })] }), _jsxs("div", { className: css.actions, children: [_jsx("button", { type: "button", tabIndex: open ? 0 : -1, className: css.action, onClick: skipTonight, children: "\u4ECA\u665A\u4E0D\u518D\u63D0\u9192" }), _jsx("button", { type: "button", tabIndex: open ? 0 : -1, className: `${css.action} ${css.snooze}`, onClick: snooze, children: "15 \u5206\u949F\u540E" })] })] }))] }));
}
