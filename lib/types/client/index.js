import { DeepSleepCat } from "./DeepSleepCat.js";
export const inject = ['slots'];
/** Register the reminder into DSH's official session-header action slot. */
export function apply(ctx) {
    ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'deep-sleep-cat',
        order: 100,
    }, DeepSleepCat));
}
