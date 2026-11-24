import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExerciseAttempt } from "@/application/ports/attempt-repository";
import type { SkillProgress, ReviewSchedule } from "@/learning/core/progress";
import type { LearningSession } from "@/learning/core/session";
import { createFsrsReviewScheduler } from "@/learning/scheduling/review-scheduler";
import { KNOWN_SCHEDULER_IDS } from "@/learning/scheduling/scheduler-identifiers";
import { DexieAnswerRecorder } from "./answer-recorder";
import { DutchFlowDatabase } from "./database";

const db = new DutchFlowDatabase(`dutchflow-answer-recorder-${crypto.randomUUID()}`);
const recorder = new DexieAnswerRecorder(db);
const learnerId = "learner-a";
const skillId = "verb:lopen:perfectum";
const reviewedAt = "2026-11-24T12:00:00.000Z";
const scheduler = createFsrsReviewScheduler();

function session(): LearningSession {
  return {
    id: "session-a",
    learnerId,
    moduleId: "verbs",
    startedAt: reviewedAt,
    strategy: "balanced",
    preferences: { level: "A1", dailyLearningMinutes: 10 },
    plannedSkillIds: [skillId],
    plannedExerciseTypes: ["typed-answer"],
  };
}

function attempt(id: string): ExerciseAttempt {
  return {
    id,
    learnerId,
    skillId,
    skillIds: [skillId],
    sessionId: "session-a",
    contentId: "verb:lopen",
    moduleId: "verbs",
    exerciseType: "typed-answer",
    answer: { type: "typed-answer", value: "Ik heb gelopen." },
    correct: true,
    rating: "good",
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
  };
}

function skillUpdate() {
  return {
    learnerId,
    skillId,
    buildRecords(previousProgress?: SkillProgress, previousSchedule?: ReviewSchedule) {
      const card = scheduler.schedule({
        card: previousSchedule?.card,
        rating: "good",
        now: new Date(reviewedAt),
      });
      return {
        progress: {
          id: `${learnerId}:${skillId}`,
          learnerId,
          skillId,
          moduleId: "verbs",
          itemId: "verb:lopen",
          focusId: "perfectum",
          attempts: (previousProgress?.attempts ?? 0) + 1,
          correctAttempts: (previousProgress?.correctAttempts ?? 0) + 1,
          consecutiveCorrect: (previousProgress?.consecutiveCorrect ?? 0) + 1,
          exerciseStage: 1 as const,
          lastReviewedAt: reviewedAt,
          createdAt: previousProgress?.createdAt ?? reviewedAt,
          updatedAt: reviewedAt,
        },
        schedule: {
          id: `${learnerId}:${skillId}`,
          learnerId,
          skillId,
          moduleId: "verbs",
          itemId: "verb:lopen",
          focusId: "perfectum",
          scheduler: KNOWN_SCHEDULER_IDS[0],
          card,
          dueAt: card.due,
          updatedAt: reviewedAt,
        },
      };
    },
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all([
    db.exerciseAttempts.clear(),
    db.skillProgress.clear(),
    db.reviewSchedules.clear(),
    db.learningSessions.clear(),
  ]);
});

describe("DexieAnswerRecorder", () => {
  it("persists nothing when the attempt write fails", async () => {
    vi.spyOn(db.exerciseAttempts, "add").mockRejectedValue(new Error("Injected attempt failure."));

    await expect(recorder.record({
      session: session(),
      attempt: attempt("attempt-failing"),
      skillUpdates: [skillUpdate()],
    })).rejects.toThrow("Injected attempt failure.");

    expect(await db.exerciseAttempts.count()).toBe(0);
    expect(await db.skillProgress.count()).toBe(0);
    expect(await db.reviewSchedules.count()).toBe(0);
    expect(await db.learningSessions.count()).toBe(0);
  });

  it("rolls back the attempt when a progress write fails", async () => {
    vi.spyOn(db.skillProgress, "put").mockRejectedValue(new Error("Injected progress failure."));

    await expect(recorder.record({
      session: session(),
      attempt: attempt("attempt-failing"),
      skillUpdates: [skillUpdate()],
    })).rejects.toThrow("Injected progress failure.");

    expect(await db.exerciseAttempts.count()).toBe(0);
    expect(await db.skillProgress.count()).toBe(0);
    expect(await db.reviewSchedules.count()).toBe(0);
    expect(await db.learningSessions.count()).toBe(0);
  });

  it("rolls back the attempt and progress when a schedule write fails", async () => {
    vi.spyOn(db.reviewSchedules, "put").mockRejectedValue(new Error("Injected schedule failure."));

    await expect(recorder.record({
      session: session(),
      attempt: attempt("attempt-failing"),
      skillUpdates: [skillUpdate()],
    })).rejects.toThrow("Injected schedule failure.");

    expect(await db.exerciseAttempts.count()).toBe(0);
    expect(await db.skillProgress.count()).toBe(0);
    expect(await db.reviewSchedules.count()).toBe(0);
    expect(await db.learningSessions.count()).toBe(0);
  });

  it("rolls back all answer records when creating the session fails", async () => {
    vi.spyOn(db.learningSessions, "add").mockRejectedValue(new Error("Injected session failure."));

    await expect(recorder.record({
      session: session(),
      attempt: attempt("attempt-failing"),
      skillUpdates: [skillUpdate()],
    })).rejects.toThrow("Injected session failure.");

    expect(await db.exerciseAttempts.count()).toBe(0);
    expect(await db.skillProgress.count()).toBe(0);
    expect(await db.reviewSchedules.count()).toBe(0);
    expect(await db.learningSessions.count()).toBe(0);
  });

  it("reads previous skill state inside serialized transactions", async () => {
    await Promise.all([
      recorder.record({ session: session(), attempt: attempt("attempt-1"), skillUpdates: [skillUpdate()] }),
      recorder.record({ session: session(), attempt: attempt("attempt-2"), skillUpdates: [skillUpdate()] }),
    ]);

    await expect(db.skillProgress.get(`${learnerId}:${skillId}`)).resolves.toMatchObject({
      attempts: 2,
      correctAttempts: 2,
      consecutiveCorrect: 2,
    });
    await expect(db.reviewSchedules.get(`${learnerId}:${skillId}`)).resolves.toMatchObject({
      scheduler: "ts-fsrs@5.4.2/fsrs-6",
      card: { reps: 2 },
    });
    expect(await db.exerciseAttempts.count()).toBe(2);
    expect(await db.learningSessions.count()).toBe(1);
  });
});
