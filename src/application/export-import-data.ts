import { z } from "zod";
import type { LearnerDataRepository, LearnerDataSnapshot } from "./ports/learner-data-repository";
import { EXERCISE_STRATEGIES, EXPLANATION_LANGUAGES, LANGUAGE_LEVELS } from "@/learning/core/preferences";

const answerSchema = z.object({ type: z.literal("typed-answer"), value: z.string() });
const attemptFields = {
  id: z.string().min(1), learnerId: z.string().min(1), skillId: z.string().min(1), contentId: z.string().min(1),
  moduleId: z.string().min(1), exerciseType: z.string().min(1), correct: z.boolean(),
  rating: z.enum(["again", "hard", "good", "easy"]), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
};
const legacyAttemptSchema = z.object({ ...attemptFields, answer: z.string() });
const currentAttemptSchema = z.object({ ...attemptFields, answer: answerSchema });
const preferencesSchema = z.object({
  id: z.string().min(1), learnerId: z.string().min(1), level: z.enum(LANGUAGE_LEVELS),
  explanationLanguage: z.enum(EXPLANATION_LANGUAGES), exerciseStrategy: z.enum(EXERCISE_STRATEGIES),
  dailyLearningMinutes: z.number().int().min(5).max(60), updatedAt: z.string().datetime(),
});
const progressSchema = z.object({
  id: z.string().min(1), learnerId: z.string().min(1), skillId: z.string().min(1), moduleId: z.string().min(1),
  itemId: z.string().min(1), focusId: z.string().min(1), attempts: z.number().int().nonnegative(),
  correctAttempts: z.number().int().nonnegative(), consecutiveCorrect: z.number().int().nonnegative(),
  lastReviewedAt: z.string().datetime(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
const reviewScheduleSchema = z.object({
  id: z.string().min(1), learnerId: z.string().min(1), skillId: z.string().min(1), moduleId: z.string().min(1),
  itemId: z.string().min(1), focusId: z.string().min(1), scheduler: z.literal("ts-fsrs@5.4.2/fsrs-6"),
  card: z.object({ due: z.string().datetime(), stability: z.number(), difficulty: z.number(), elapsed_days: z.number(),
    scheduled_days: z.number(), learning_steps: z.number(), reps: z.number().int().nonnegative(), lapses: z.number().int().nonnegative(),
    state: z.number().int(), last_review: z.string().datetime().nullable() }),
  dueAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
const backupHeader = {
  format: z.literal("dutchflow-backup"), exportedAt: z.string().datetime(), learnerId: z.string().min(1),
};
const backupV1Schema = z.object({
  ...backupHeader, version: z.literal(1),
  snapshot: z.object({
    preferences: preferencesSchema.optional(), attempts: z.array(legacyAttemptSchema),
    progress: z.array(progressSchema), reviewSchedules: z.array(reviewScheduleSchema),
  }),
});
const backupV2Schema = z.object({
  ...backupHeader, version: z.literal(2),
  snapshot: z.object({
    preferences: preferencesSchema.optional(), attempts: z.array(currentAttemptSchema),
    progress: z.array(progressSchema), reviewSchedules: z.array(reviewScheduleSchema),
  }),
});
const backupSchema = z.discriminatedUnion("version", [backupV1Schema, backupV2Schema]);

export async function exportLearnerData(
  learnerId: string,
  dependencies: { data: LearnerDataRepository; now?: () => Date },
): Promise<string> {
  const snapshot = await dependencies.data.read(learnerId);
  const backup = backupV2Schema.parse({
    format: "dutchflow-backup" as const,
    version: 2 as const,
    exportedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    learnerId,
    snapshot: {
      ...snapshot,
      attempts: snapshot.attempts.map((attempt) => ({
        ...attempt,
        answer: typeof attempt.answer === "string"
          ? { type: "typed-answer" as const, value: attempt.answer }
          : attempt.answer,
      })),
    },
  });
  return JSON.stringify(backup, null, 2);
}

export async function importLearnerData(
  learnerId: string,
  serialized: string,
  dependencies: { data: LearnerDataRepository },
): Promise<LearnerDataSnapshot> {
  const backup = backupSchema.parse(JSON.parse(serialized) as unknown);
  const snapshot: LearnerDataSnapshot = {
    preferences: backup.snapshot.preferences && {
      ...backup.snapshot.preferences, id: learnerId, learnerId,
    },
    attempts: backup.snapshot.attempts.map((attempt) => ({
      ...attempt,
      answer: typeof attempt.answer === "string"
        ? { type: "typed-answer" as const, value: attempt.answer }
        : attempt.answer,
      learnerId,
    })),
    progress: backup.snapshot.progress.map((item) => ({
      ...item, id: `${learnerId}:${item.skillId}`, learnerId,
    })),
    reviewSchedules: backup.snapshot.reviewSchedules.map((item) => ({
      ...item, id: `${learnerId}:${item.skillId}`, learnerId,
    })),
  };
  await dependencies.data.replace(learnerId, snapshot);
  return snapshot;
}
