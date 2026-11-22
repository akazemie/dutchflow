import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCE_VALUES, type LearnerPreferences } from "@/learning/core/preferences";
import { verbsModule } from "@/learning/modules/verbs/module";
import { startSession } from "./start-session";

describe("startSession", () => {
  it("includes lower-level items when preparing a higher-level session", async () => {
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
    expect(session.plan.every(({ itemId }) => itemId === "verb:lopen")).toBe(true);
    expect(session.module.id).toBe("verbs");
  });

  it("offers known skills as extra practice when new work and due reviews are absent", async () => {
    const preferences: LearnerPreferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      ...DEFAULT_PREFERENCE_VALUES,
      dailyLearningMinutes: 60,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    const allA1Items = await verbsModule.loadItems({ level: "A1" });
    const knownSkillIds: string[] = [];
    for (const item of allA1Items) {
      for (const focus of verbsModule.exerciseFocuses) {
        const exercise = await verbsModule.createExercise(item.id, { focusId: focus.id });
        knownSkillIds.push(exercise.skillId);
      }
    }
    const session = await startSession({
      module: verbsModule,
      preferences,
      dueReviews: [],
      knownSkillIds,
    });

    expect(session.plan.map(({ skillId }) => skillId)).toContain("verb:lopen:perfectum");
    expect(session.plan).toHaveLength(30);
  });
});
