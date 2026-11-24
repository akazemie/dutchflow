import { afterEach, describe, expect, it } from "vitest";
import type { LearningSession } from "@/learning/core/session";
import { DexieLearningSessionRepository } from "./learning-session-repository";
import { DutchFlowDatabase } from "./database";

const db = new DutchFlowDatabase(`dutchflow-sessions-${crypto.randomUUID()}`);
const repository = new DexieLearningSessionRepository(db);

afterEach(async () => {
  await db.learningSessions.clear();
});

describe("DexieLearningSessionRepository", () => {
  it("persists planned session metadata and marks it completed", async () => {
    const session: LearningSession = {
      id: "session-a",
      learnerId: "learner-a",
      moduleId: "verbs",
      startedAt: "2026-11-24T12:00:00.000Z",
      strategy: "review-first",
      preferences: { level: "A2", dailyLearningMinutes: 20 },
      plannedSkillIds: ["verb:lopen:perfectum", "verb:lopen:imperfectum:singular"],
      plannedExerciseTypes: ["matching"],
    };
    await repository.save(session);

    await repository.complete("learner-a", session.id, "2026-11-24T12:05:00.000Z");

    await expect(db.learningSessions.get(session.id)).resolves.toEqual({
      ...session,
      completedAt: "2026-11-24T12:05:00.000Z",
    });
  });

  it("does not complete a session owned by another learner", async () => {
    await repository.save({
      id: "session-a",
      learnerId: "learner-a",
      moduleId: "verbs",
      startedAt: "2026-11-24T12:00:00.000Z",
      strategy: "balanced",
      preferences: { level: "A1", dailyLearningMinutes: 10 },
      plannedSkillIds: [],
      plannedExerciseTypes: [],
    });

    await expect(repository.complete("learner-b", "session-a", "2026-11-24T12:05:00.000Z"))
      .rejects.toThrow("was not found for learner learner-b");
    expect((await db.learningSessions.get("session-a"))?.completedAt).toBeUndefined();
  });
});
