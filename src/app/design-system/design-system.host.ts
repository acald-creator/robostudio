/**
 * The custom element the design system reference bootstraps into.
 *
 * index.html only ships <app-root>, so main.ts has to create this host before
 * bootstrapping. Both the component's selector and that createElement call read
 * this constant, so they cannot drift apart — a mismatch is NG05104 on a blank
 * page, which is exactly the failure this exists to prevent.
 *
 * Kept free of Angular imports so main.ts can reference it without pulling the
 * component into the initial bundle.
 */
export const DESIGN_SYSTEM_TAG = "app-design-system";
