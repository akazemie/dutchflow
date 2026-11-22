import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCE_VALUES, type LearnerPreferences } from "@/learning/core/preferences";
import { verbsModule } from "@/learning/modules/verbs/module";
import { startSession } from "./start-session";

describe("startSession", () => {
  it("uses the selected level and daily time budget to prepare new practice", async () => {
    const preferences: LearnerPreferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      ...DEFAULT_PREFERENCE_VALUES,
      level: "A2",
      dailyLearningMinutes: 4,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };

    const session = await startSession({ module: verbsModule, preferences, dueReviews: [] });

    expect(session.plan).toHaveLength(2);
    expect(session.plan.every(({ itemId }) => itemId === "verb:beantwoorden" || itemId === "verb:bezoeken")).toBe(true);
    expect(session.module.id).toBe("verbs");
  });

  it("does not offer known skills as new work unless they are due", async () => {
    const preferences: LearnerPreferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      ...DEFAULT_PREFERENCE_VALUES,
      dailyLearningMinutes: 60,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    const session = await startSession({
      module: verbsModule,
      preferences,
      dueReviews: [],
      knownSkillIds: ["verb:lopen:perfectum"],
    });

    expect(session.plan.map(({ skillId }) => skillId)).not.toContain("verb:lopen:perfectum");
  });
});
