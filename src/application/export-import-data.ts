import { z } from "zod";
import type { LearnerDataRepository, LearnerDataSnapshot } from "./ports/learner-data-repository";
import { EXERCISE_STRATEGIES, EXPLANATION_LANGUAGES, LANGUAGE_LEVELS } from "@/learning/core/preferences";
import { getExerciseStage } from "@/learning/core/progress";
import { KNOWN_SCHEDULER_IDS } from "@/learning/scheduling/scheduler-identifiers";
import type { SchedulerId } from "@/learning/scheduling/scheduler-identifiers";

const typedAnswerSchema = z.object({ type: z.literal("typed-answer"), value: z.string() });
const v3AnswerSchema = z.discriminatedUnion("type", [
  typedAnswerSchema,
  z.object({ type: z.literal("multiple-choice"), optionId: z.string() }),
  z.object({ type: z.literal("fill-gap"), values: z.record(z.string(), z.string()) }),
  z.object({ type: z.literal("word-ordering"), tokenIds: z.array(z.string()) }),
  z.object({ type: z.literal("matching"), matches: z.record(z.string(), z.string()) }),
]);
const exerciseTypeSchema = z.enum([
  "typed-answer",
  "multiple-choice",
  "fill-gap",
  "word-ordering",
  "matching",
]);
const attemptFields = {
  id: z.string().min(1), learnerId: z.string().min(1), skillId: z.string().min(1), contentId: z.string().min(1),
  moduleId: z.string().min(1), exerciseType: z.string().min(1), correct: z.boolean(),
  rating: z.enum(["again", "hard", "good", "easy"]), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
};
const legacyAttemptSchema = z.object({ ...attemptFields, answer: z.string() });
const currentAttemptSchema = z.object({ ...attemptFields, answer: typedAnswerSchema });
const v3AttemptSchema = z.object({ ...attemptFields, answer: v3AnswerSchema });
const v4AttemptSchema = z.object({
  ...attemptFields,
  skillIds: z.array(z.string().min(1)).min(1),
  sessionId: z.string().min(1).nullable(),
  durationMs: z.number().int().nonnegative().optional(),
  answer: v3AnswerSchema,
});
const preferencesSchema = z.object({
  id: z.string().min(1), learnerId: z.string().min(1), level: z.enum(LANGUAGE_LEVELS),
  explanationLanguage: z.enum(EXPLANATION_LANGUAGES), exerciseStrategy: z.enum(EXERCISE_STRATEGIES),
  dailyLearningMinutes: z.number().int().min(5).max(60), updatedAt: z.string().datetime(),
});
const progressSchema = z.object({
  id: z.string().min(1), learnerId: z.string().min(1), skillId: z.string().min(1), moduleId: z.string().min(1),
  itemId: z.string().min(1), focusId: z.string().min(1), attempts: z.number().int().nonnegative(),
  correctAttempts: z.number().int().nonnegative(), consecutiveCorrect: z.number().int().nonnegative(),
  exerciseStage: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  lastReviewedAt: z.string().datetime(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
const schedulerSchema = z.string().refine(
  (scheduler): scheduler is SchedulerId => KNOWN_SCHEDULER_IDS.some((known) => known === scheduler),
  { message: `Unsupported scheduler identifier. Known identifiers: ${KNOWN_SCHEDULER_IDS.join(", ")}.` },
);
const reviewScheduleSchema = z.object({
  id: z.string().min(1), learnerId: z.string().min(1), skillId: z.string().min(1), moduleId: z.string().min(1),
  itemId: z.string().min(1), focusId: z.string().min(1),
  scheduler: schedulerSchema,
  card: z.object({ due: z.string().datetime(), stability: z.number(), difficulty: z.number(), elapsed_days: z.number(),
    scheduled_days: z.number(), learning_steps: z.number(), reps: z.number().int().nonnegative(), lapses: z.number().int().nonnegative(),
    state: z.number().int(), last_review: z.string().datetime().nullable() }),
  dueAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
const sessionSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  moduleId: z.string().min(1),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  strategy: z.enum(EXERCISE_STRATEGIES),
  preferences: z.object({
    level: z.enum(LANGUAGE_LEVELS),
    dailyLearningMinutes: z.number().int().min(5).max(60),
  }),
  plannedSkillIds: z.array(z.string().min(1)),
  plannedExerciseTypes: z.array(exerciseTypeSchema),
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
const backupV3Schema = z.object({
  ...backupHeader, version: z.literal(3),
  snapshot: z.object({
    preferences: preferencesSchema.optional(), attempts: z.array(v3AttemptSchema),
    progress: z.array(progressSchema), reviewSchedules: z.array(reviewScheduleSchema),
  }),
});
const backupV4Schema = z.object({
  ...backupHeader, version: z.literal(4),
  snapshot: z.object({
    preferences: preferencesSchema.optional(), attempts: z.array(v4AttemptSchema),
    progress: z.array(progressSchema), reviewSchedules: z.array(reviewScheduleSchema),
    sessions: z.array(sessionSchema),
  }),
});
const backupSchema = z.discriminatedUnion("version", [
  backupV1Schema,
  backupV2Schema,
  backupV3Schema,
  backupV4Schema,
]);

export async function exportLearnerData(
  learnerId: string,
  dependencies: { data: LearnerDataRepository; now?: () => Date },
): Promise<string> {
  const snapshot = await dependencies.data.read(learnerId);
  const backup = backupV4Schema.parse({
    format: "dutchflow-backup" as const,
    version: 4 as const,
    exportedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    learnerId,
    snapshot: {
      ...snapshot,
      progress: snapshot.progress.map((item) => ({
        ...item,
        exerciseStage: getExerciseStage(item),
      })),
      attempts: snapshot.attempts.map((attempt) => ({
        ...attempt,
        skillIds: attempt.skillIds,
        answer: attempt.answer,
      })),
      sessions: snapshot.sessions,
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
  const sessions = "sessions" in backup.snapshot ? backup.snapshot.sessions : [];
  const snapshot: LearnerDataSnapshot = {
    preferences: backup.snapshot.preferences && {
      ...backup.snapshot.preferences, id: learnerId, learnerId,
    },
    attempts: backup.snapshot.attempts.map((attempt) => ({
      ...attempt,
      skillIds: "skillIds" in attempt ? attempt.skillIds : [attempt.skillId],
      sessionId: "sessionId" in attempt ? attempt.sessionId : null,
      durationMs: "durationMs" in attempt ? attempt.durationMs : undefined,
      answer: typeof attempt.answer === "string"
        ? { type: "typed-answer" as const, value: attempt.answer }
        : attempt.answer,
      learnerId,
    })),
    progress: backup.snapshot.progress.map((item) => ({
      ...item,
      exerciseStage: getExerciseStage(item),
      id: `${learnerId}:${item.skillId}`,
      learnerId,
    })),
    reviewSchedules: backup.snapshot.reviewSchedules.map((item) => ({
      ...item, id: `${learnerId}:${item.skillId}`, learnerId,
    })),
    sessions: sessions.map((session) => ({ ...session, learnerId })),
  };
  await dependencies.data.replace(learnerId, snapshot);
  return snapshot;
}
