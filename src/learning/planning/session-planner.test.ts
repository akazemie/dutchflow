import { describe, expect, it } from "vitest";
import { planSession, type SessionCandidate } from "./session-planner";

const due: SessionCandidate[] = [
  { skillId: "due-1", moduleId: "verbs", itemId: "verb:lopen", focusId: "perfectum", estimatedMinutes: 2 },
  { skillId: "due-2", moduleId: "verbs", itemId: "verb:werken", focusId: "perfectum", estimatedMinutes: 2 },
];
const fresh: SessionCandidate[] = [
  { skillId: "new-1", moduleId: "verbs", itemId: "verb:lopen", focusId: "imperfectum-singular", estimatedMinutes: 2 },
  { skillId: "new-2", moduleId: "vocabulary", itemId: "word:fiets", focusId: "meaning", estimatedMinutes: 2 },
];
const practice: SessionCandidate[] = [
  { skillId: "known-1", moduleId: "verbs", itemId: "verb:lopen", focusId: "perfectum", estimatedMinutes: 2 },
];

describe("planSession", () => {
  it("alternates due reviews and new items within the learner's time budget", () => {
    expect(planSession({ dueReviews: due, newItems: fresh, strategy: "balanced", timeBudgetMinutes: 6 }).map(({ skillId }) => skillId))
      .toEqual(["due-1", "new-1", "due-2"]);
  });

  it("orders reviews first or new items first when requested", () => {
    const reviewFirst = planSession({ dueReviews: due, newItems: fresh, strategy: "review-first", timeBudgetMinutes: 4 });
    const newFirst = planSession({ dueReviews: due, newItems: fresh, strategy: "new-first", timeBudgetMinutes: 4 });

    expect(reviewFirst.map(({ skillId }) => skillId)).toEqual(["due-1", "due-2"]);
    expect(newFirst.map(({ skillId }) => skillId)).toEqual(["new-1", "new-2"]);
  });

  it("adds already learned skills as fallback practice after due and new items", () => {
    const plan = planSession({
      dueReviews: [], newItems: [], practiceItems: practice, strategy: "balanced", timeBudgetMinutes: 2,
    });

    expect(plan).toEqual(practice);
  });

  it("avoids duplicates and returns an empty plan for a non-positive budget", () => {
    const duplicate = { skillId: "due-1", moduleId: "verbs", itemId: "verb:lopen", focusId: "perfectum", estimatedMinutes: 1 };
    expect(planSession({ dueReviews: [duplicate], newItems: [duplicate], strategy: "balanced", timeBudgetMinutes: 2 }))
      .toEqual([duplicate]);
    expect(planSession({ dueReviews: due, newItems: fresh, strategy: "balanced", timeBudgetMinutes: 0 })).toEqual([]);
  });
});
