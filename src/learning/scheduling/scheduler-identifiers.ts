export const KNOWN_SCHEDULER_IDS = ["ts-fsrs@5.4.2/fsrs-6"] as const;

export type SchedulerId = (typeof KNOWN_SCHEDULER_IDS)[number];
