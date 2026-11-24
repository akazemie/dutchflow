import { afterEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import { DexieAttemptRepository } from "./attempt-repository";
import { DutchFlowDatabase } from "./database";
import type { StoredExerciseAttempt } from "@/application/ports/attempt-repository";

describe("DexieAttemptRepository", () => {
  const db = new DutchFlowDatabase(`dutchflow-test-${crypto.randomUUID()}`);
  const repository = new DexieAttemptRepository(db);

  afterEach(async () => {
    await db.exerciseAttempts.clear();
  });

  it("persists an attempt with learner and skill IDs", async () => {
    const attempt = {
      id: crypto.randomUUID(),
      learnerId: "00000000-0000-4000-8000-000000000001",
      skillId: "verb:lopen:perfectum",
      skillIds: ["verb:lopen:perfectum"],
      sessionId: null,
      contentId: "verb:lopen",
      moduleId: "verbs",
      exerciseType: "typed-answer",
      answer: { type: "typed-answer" as const, value: "Ik heb gelopen." },
      correct: true,
      rating: "good" as const,
      createdAt: "2026-11-22T12:00:00.000Z",
      updatedAt: "2026-11-22T12:00:00.000Z",
    };

    await repository.save(attempt);

    await expect(db.exerciseAttempts.get(attempt.id)).resolves.toEqual(attempt);
  });

  it("reads legacy attempts whose answer is still a string", async () => {
    const legacyAttempt: StoredExerciseAttempt = {
      id: "legacy-attempt",
      learnerId: "legacy-learner",
      skillId: "verb:lopen:perfectum",
      contentId: "verb:lopen",
      moduleId: "verbs",
      exerciseType: "typed-answer",
      answer: "Ik heb gelopen.",
      correct: true,
      rating: "good",
      createdAt: "2026-11-22T12:00:00.000Z",
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    await db.exerciseAttempts.put(legacyAttempt);

    const repository = new DexieAttemptRepository(db);
    const attempts = await repository.listByLearner("legacy-learner");

    expect(attempts).toEqual([{
      ...legacyAttempt,
      answer: { type: "typed-answer", value: "Ik heb gelopen." },
      skillIds: [legacyAttempt.skillId],
      sessionId: null,
    }]);
  });

  it("migrates a v3 attempt row to the v4 answer and skill schema", async () => {
    const dbName = `dutchflow-migration-${crypto.randomUUID()}`;
    const legacyDb = new Dexie(dbName);
    legacyDb.version(1).stores({
      exerciseAttempts: "id, learnerId, skillId, contentId, moduleId, createdAt, updatedAt",
    });
    legacyDb.version(2).stores({
      exerciseAttempts: "id, learnerId, skillId, contentId, moduleId, createdAt, updatedAt",
      learnerPreferences: "id, learnerId, updatedAt",
    });
    legacyDb.version(3).stores({
      exerciseAttempts: "id, learnerId, skillId, contentId, moduleId, createdAt, updatedAt",
      learnerPreferences: "id, learnerId, updatedAt",
      skillProgress: "id, learnerId, skillId, moduleId, updatedAt, &[learnerId+skillId]",
      reviewSchedules: "id, learnerId, skillId, moduleId, dueAt, [learnerId+dueAt], &[learnerId+skillId]",
    });
    await legacyDb.open();
    await legacyDb.table("exerciseAttempts").put({
      id: "v3-attempt",
      learnerId: "legacy-learner",
      skillId: "verb:lopen:perfectum",
      contentId: "verb:lopen",
      moduleId: "verbs",
      exerciseType: "typed-answer",
      answer: "Ik heb gelopen.",
      correct: true,
      rating: "good",
      createdAt: "2026-11-22T12:00:00.000Z",
      updatedAt: "2026-11-22T12:00:00.000Z",
    });
    legacyDb.close();

    const upgradedDb = new DutchFlowDatabase(dbName);
    try {
      await upgradedDb.open();
      const attempt = await upgradedDb.exerciseAttempts.get("v3-attempt");
      expect(attempt).toMatchObject({
        skillIds: ["verb:lopen:perfectum"],
        answer: { type: "typed-answer", value: "Ik heb gelopen." },
        sessionId: null,
      });
      expect(await upgradedDb.learningSessions.count()).toBe(0);
    } finally {
      await upgradedDb.delete();
    }
  });
});
