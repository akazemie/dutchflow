import { afterEach, describe, expect, it } from "vitest";
import { DexiePreferencesRepository } from "./preferences-repository";
import { DutchFlowDatabase } from "./database";

describe("DexiePreferencesRepository", () => {
  const dbName = `dutchflow-preferences-test-${crypto.randomUUID()}`;
  const db = new DutchFlowDatabase(dbName);
  const repository = new DexiePreferencesRepository(db);

  afterEach(async () => {
    await db.delete();
  });

  it("persists and retrieves learner preferences independently by learner", async () => {
    const preferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      level: "A2" as const,
      explanationLanguage: "nl" as const,
      exerciseStrategy: "review-first" as const,
      dailyLearningMinutes: 20,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };

    await repository.save(preferences);

    await db.close();
    const reopenedDatabase = new DutchFlowDatabase(dbName);
    const reopenedRepository = new DexiePreferencesRepository(reopenedDatabase);
    await expect(reopenedRepository.getByLearnerId(preferences.learnerId)).resolves.toEqual(preferences);
    await reopenedDatabase.delete();
  });
});
