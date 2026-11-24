import { afterEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import { DexieAttemptRepository } from "./attempt-repository";
import { DutchFlowDatabase } from "./database";
import type { StoredExerciseAttempt } from "@/application/ports/attempt-repository";

describe("DexieAttemptRepository", () => {
  const db = new DutchFlowDatabase(`dutchflow-test-${crypto.randomUUID()}`);

  afterEach(async () => {
    await db.exerciseAttempts.clear();
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

  it("lists attempts since an indexed createdAt boundary for one learner", async () => {
    const repository = new DexieAttemptRepository(db);
    const records: StoredExerciseAttempt[] = [
      {
        id: "before-midnight",
        learnerId: "learner-a",
        skillId: "verb:lopen:perfectum",
        contentId: "verb:lopen",
        moduleId: "verbs",
        exerciseType: "typed-answer",
        answer: "old answer",
        correct: true,
        rating: "good",
        createdAt: "2026-11-23T23:59:59.999Z",
        updatedAt: "2026-11-23T23:59:59.999Z",
      },
      {
        id: "at-boundary",
        learnerId: "learner-a",
        skillId: "verb:lopen:perfectum",
        contentId: "verb:lopen",
        moduleId: "verbs",
        exerciseType: "typed-answer",
        answer: "today",
        correct: true,
        rating: "good",
        createdAt: "2026-11-24T00:00:00.000Z",
        updatedAt: "2026-11-24T00:00:00.000Z",
      },
      {
        id: "other-learner",
        learnerId: "learner-b",
        skillId: "verb:lopen:perfectum",
        contentId: "verb:lopen",
        moduleId: "verbs",
        exerciseType: "typed-answer",
        answer: "today",
        correct: true,
        rating: "good",
        createdAt: "2026-11-24T08:00:00.000Z",
        updatedAt: "2026-11-24T08:00:00.000Z",
      },
    ];
    await db.exerciseAttempts.bulkPut(records);

    const attempts = await repository.listSince("learner-a", "2026-11-24T00:00:00.000Z");

    expect(attempts.map(({ id, answer }) => ({ id, answer }))).toEqual([{
      id: "at-boundary",
      answer: { type: "typed-answer", value: "today" },
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
