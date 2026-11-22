import { afterEach, describe, expect, it } from "vitest";
import { DexieAttemptRepository } from "./attempt-repository";
import { DutchFlowDatabase } from "./database";

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
      contentId: "verb:lopen",
      moduleId: "verbs",
      exerciseType: "typed-answer",
      answer: "Ik heb gelopen.",
      correct: true,
      rating: "good" as const,
      createdAt: "2026-11-22T12:00:00.000Z",
      updatedAt: "2026-11-22T12:00:00.000Z",
    };

    await repository.save(attempt);

    await expect(db.exerciseAttempts.get(attempt.id)).resolves.toEqual(attempt);
  });
});
