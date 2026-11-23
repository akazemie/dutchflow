import type { AttemptRepository, ExerciseAttempt } from "@/application/ports/attempt-repository";
import type { Answer, LearningExercise, LearningModule } from "@/learning/contracts/module";
import type { ProgressRepository } from "./ports/progress-repository";
import type { ReviewScheduleRepository } from "./ports/review-schedule-repository";
import type { ReviewScheduler } from "@/learning/scheduling/review-scheduler";
import type { SkillProgress, ReviewSchedule } from "@/learning/core/progress";
import { skillRecordId } from "@/learning/core/progress";

export interface SubmitAnswerInput {
  learnerId: string;
  module: LearningModule;
  exercise: LearningExercise;
  answer: Answer;
}

export async function submitAnswer(
  input: SubmitAnswerInput,
  dependencies: {
    attempts: AttemptRepository;
    progress: ProgressRepository;
    reviewSchedules: ReviewScheduleRepository;
    scheduler: ReviewScheduler;
    now?: () => Date;
    createId?: () => string;
  },
) {
  const result = await input.module.evaluate(input.exercise, input.answer);
  const now = (dependencies.now ?? (() => new Date()))().toISOString();
  const createId = dependencies.createId ?? (() => crypto.randomUUID());
  const attempt: ExerciseAttempt = {
    id: createId(),
    learnerId: input.learnerId,
    skillId: result.skillIds[0] ?? input.exercise.skillId,
    contentId: input.exercise.contentId,
    moduleId: input.exercise.moduleId,
    exerciseType: input.exercise.type,
    answer: input.answer,
    correct: result.correct,
    rating: result.rating,
    createdAt: now,
    updatedAt: now,
  };

  await dependencies.attempts.save(attempt);
  const skillId = attempt.skillId;
  const recordId = skillRecordId(input.learnerId, skillId);
  const [previousProgress, previousSchedule] = await Promise.all([
    dependencies.progress.get(input.learnerId, skillId),
    dependencies.reviewSchedules.get(input.learnerId, skillId),
  ]);
  const card = dependencies.scheduler.schedule({
    card: previousSchedule?.card,
    rating: result.rating,
    now: new Date(now),
  });
  const progress: SkillProgress = {
    id: recordId,
    learnerId: input.learnerId,
    skillId,
    moduleId: input.exercise.moduleId,
    itemId: input.exercise.contentId,
    focusId: input.exercise.focusId,
    attempts: (previousProgress?.attempts ?? 0) + 1,
    correctAttempts: (previousProgress?.correctAttempts ?? 0) + (result.correct ? 1 : 0),
    consecutiveCorrect: result.correct ? (previousProgress?.consecutiveCorrect ?? 0) + 1 : 0,
    lastReviewedAt: now,
    createdAt: previousProgress?.createdAt ?? now,
    updatedAt: now,
  };
  const schedule: ReviewSchedule = {
    id: recordId,
    learnerId: input.learnerId,
    skillId,
    moduleId: input.exercise.moduleId,
    itemId: input.exercise.contentId,
    focusId: input.exercise.focusId,
    scheduler: "ts-fsrs@5.4.2/fsrs-6",
    card,
    dueAt: card.due,
    updatedAt: now,
  };
  await Promise.all([
    dependencies.progress.save(progress),
    dependencies.reviewSchedules.save(schedule),
  ]);
  return { result, attempt };
}
