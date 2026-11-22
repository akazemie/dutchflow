import { describe, expect, it } from "vitest";
import type { LearnerPreferences } from "@/learning/core/preferences";
import type { PreferencesRepository } from "./ports/preferences-repository";
import { getPreferences } from "./get-preferences";
import { updatePreferences } from "./update-preferences";

describe("learner preferences", () => {
  it("creates defaults, then updates them independently from the UI", async () => {
    let stored: LearnerPreferences | undefined;
    const preferences: PreferencesRepository = {
      async getByLearnerId(learnerId) {
        return stored?.learnerId === learnerId ? stored : undefined;
      },
      async save(value) {
        stored = value;
      },
    };
    const learnerId = "00000000-0000-4000-8000-000000000001";

    await expect(getPreferences(learnerId, {
      preferences,
      now: () => new Date("2026-11-22T12:00:00.000Z"),
    })).resolves.toMatchObject({ level: "A1", explanationLanguage: "en", dailyLearningMinutes: 10 });

    await expect(updatePreferences(learnerId, {
      level: "A2",
      explanationLanguage: "fa",
      exerciseStrategy: "new-first",
      dailyLearningMinutes: 25,
    }, {
      preferences,
      now: () => new Date("2026-11-22T13:00:00.000Z"),
    })).resolves.toMatchObject({
      level: "A2",
      explanationLanguage: "fa",
      exerciseStrategy: "new-first",
      dailyLearningMinutes: 25,
    });
  });
});
