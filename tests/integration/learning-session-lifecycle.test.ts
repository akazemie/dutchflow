import { afterEach, describe, expect, it } from "vitest";
import { submitAnswer } from "@/application/submit-answer";
import { startSession } from "@/application/start-session";
import { DexieAnswerRecorder } from "@/infrastructure/dexie/answer-recorder";
import { DutchFlowDatabase } from "@/infrastructure/dexie/database";
import { DexieLearningSessionRepository } from "@/infrastructure/dexie/learning-session-repository";
import { DEFAULT_PREFERENCE_VALUES } from "@/learning/core/preferences";
import { verbsModule } from "@/learning/modules/verbs/module";
import { createFsrsReviewScheduler } from "@/learning/scheduling/review-scheduler";

describe("learning session lifecycle", () => {
  const db = new DutchFlowDatabase(`dutchflow-session-lifecycle-${crypto.randomUUID()}`);
  const answerRecorder = new DexieAnswerRecorder(db);
  const sessions = new DexieLearningSessionRepository(db);
  const learnerId = "learner-session-lifecycle";

  afterEach(async () => {
    await Promise.all([
      db.exerciseAttempts.clear(),
      db.skillProgress.clear(),
      db.reviewSchedules.clear(),
      db.learningSessions.clear(),
    ]);
  });

  it("persists a session with its first answer, reuses it, and completes it", async () => {
    const prepared = await startSession({
      learnerId,
      module: verbsModule,
      preferences: {
        id: learnerId,
        learnerId,
        ...DEFAULT_PREFERENCE_VALUES,
        level: "A1",
        dailyLearningMinutes: 10,
        updatedAt: "2026-11-24T11:00:00.000Z",
      },
      dueReviews: [],
    }, {
      now: () => new Date("2026-11-24T12:00:00.000Z"),
      createId: () => "session-lifecycle",
    });

    expect(await db.learningSessions.count()).toBe(0);

    const exercise = await verbsModule.createExercise("verb:lopen", {
      focusId: "perfectum",
      exerciseType: "typed-answer",
    });
    const scheduler = createFsrsReviewScheduler();
    const answers = ["Ik heb gelopen.", "Ik heb gelopen."];

    for (const [index, value] of answers.entries()) {
      const { attempt } = await submitAnswer({
        learnerId,
        session: prepared.session,
        module: verbsModule,
        exercise,
        answer: { type: "typed-answer", value },
      }, {
        answerRecorder,
        scheduler,
        now: () => new Date("2026-11-24T12:01:00.000Z"),
        createId: () => `attempt-session-${index}`,
      });

      expect(attempt.sessionId).toBe(prepared.session.id);
      expect(await db.learningSessions.count()).toBe(1);
    }

    expect(await db.exerciseAttempts.count()).toBe(2);
    expect(await db.learningSessions.get(prepared.session.id)).toMatchObject({
      id: prepared.session.id,
      learnerId,
      moduleId: "verbs",
    });

    await sessions.complete(learnerId, prepared.session.id, "2026-11-24T12:05:00.000Z");
    expect((await db.learningSessions.get(prepared.session.id))?.completedAt)
      .toBe("2026-11-24T12:05:00.000Z");
  });
});
