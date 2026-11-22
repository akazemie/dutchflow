import type { ExerciseStrategy } from "@/learning/core/preferences";

export interface SessionCandidate {
  skillId: string;
  moduleId: string;
  itemId: string;
  focusId: string;
  estimatedMinutes: number;
}

export interface SessionPlanInput {
  dueReviews: SessionCandidate[];
  newItems: SessionCandidate[];
  practiceItems?: SessionCandidate[];
  strategy: ExerciseStrategy;
  timeBudgetMinutes: number;
}

function alternate(due: SessionCandidate[], fresh: SessionCandidate[]): SessionCandidate[] {
  const result: SessionCandidate[] = [];
  const count = Math.max(due.length, fresh.length);
  for (let index = 0; index < count; index += 1) {
    if (due[index]) result.push(due[index]);
    if (fresh[index]) result.push(fresh[index]);
  }
  return result;
}

export function planSession(input: SessionPlanInput): SessionCandidate[] {
  if (!Number.isFinite(input.timeBudgetMinutes) || input.timeBudgetMinutes <= 0) return [];

  const seen = new Set<string>();
  const due = input.dueReviews.filter((item) => !seen.has(item.skillId) && Boolean(seen.add(item.skillId)));
  const fresh = input.newItems.filter((item) => !seen.has(item.skillId) && Boolean(seen.add(item.skillId)));
  const practice = (input.practiceItems ?? []).filter((item) => !seen.has(item.skillId) && Boolean(seen.add(item.skillId)));
  const ordered = input.strategy === "review-first"
    ? [...due, ...fresh, ...practice]
    : input.strategy === "new-first"
      ? [...fresh, ...due, ...practice]
      : [...alternate(due, fresh), ...practice];

  const plan: SessionCandidate[] = [];
  let spent = 0;
  for (const item of ordered) {
    if (!Number.isFinite(item.estimatedMinutes) || item.estimatedMinutes <= 0) continue;
    if (spent + item.estimatedMinutes > input.timeBudgetMinutes) continue;
    plan.push(item);
    spent += item.estimatedMinutes;
  }
  return plan;
}
