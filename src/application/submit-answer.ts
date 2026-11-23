import type { AttemptRepository, ExerciseAttempt } from "@/application/ports/attempt-repository";
import type { Answer, LearningExercise, LearningModule } from "@/learning/contracts/module";
import type { ProgressRepository } from "./ports/progress-repository";
import type { ReviewScheduleRepository } from "./ports/review-schedule-repository";
import type { ReviewScheduler } from "@/learning/scheduling/review-scheduler";
import type { SkillProgress, ReviewSchedule } from "@/learning/core/progress";
import { advanceExerciseStage, getExerciseStage, skillRecordId } from "@/learning/core/progress";
import { createExerciseId } from "@/learning/core/create-exercise-id";

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
  if (result.skillResults.length === 0) {
    throw new Error("Exercise evaluation must return at least one skill result.");
  }
  const now = (dependencies.now ?? (() => new Date()))().toISOString();
  const createId = dependencies.createId ?? createExerciseId;
  const attempt: ExerciseAttempt = {
    id: createId(),
    learnerId: input.learnerId,
    skillId: result.skillResults[0]!.skillId,
    contentId: input.exercise.contentId,
    moduleId: input.exercise.moduleId,
    exerciseType: input.exercise.type,
    answer: input.answer,
    correct: result.correct,
    rating: result.rating,
    createdAt: now,
    updatedAt: now,
  };

  const focusBySkill = new Map(
    input.module.listSkills(input.exercise.contentId).map(({ skillId, focusId }) => [skillId, focusId]),
  );
  const skillResultsWithFocus = result.skillResults.map((skillResult) => {
    const focusId = focusBySkill.get(skillResult.skillId);
    if (!focusId) {
      throw new Error(`Exercise result references unknown skill ${skillResult.skillId}.`);
    }
    return { skillResult, focusId };
  });
  await dependencies.attempts.save(attempt);
  const updates = await Promise.all(skillResultsWithFocus.map(async ({ skillResult, focusId }) => {
    const recordId = skillRecordId(input.learnerId, skillResult.skillId);
    const [previousProgress, previousSchedule] = await Promise.all([
      dependencies.progress.get(input.learnerId, skillResult.skillId),
      dependencies.reviewSchedules.get(input.learnerId, skillResult.skillId),
    ]);
    const card = dependencies.scheduler.schedule({
      card: previousSchedule?.card,
      rating: skillResult.rating,
      now: new Date(now),
    });
    const stage = getExerciseStage(previousProgress);
    const progress: SkillProgress = {
      id: recordId,
      learnerId: input.learnerId,
      skillId: skillResult.skillId,
      moduleId: input.exercise.moduleId,
      itemId: input.exercise.contentId,
      focusId,
      attempts: (previousProgress?.attempts ?? 0) + 1,
      correctAttempts: (previousProgress?.correctAttempts ?? 0) + (skillResult.correct ? 1 : 0),
      consecutiveCorrect: skillResult.correct ? (previousProgress?.consecutiveCorrect ?? 0) + 1 : 0,
      exerciseStage: advanceExerciseStage(stage, skillResult.correct),
      lastReviewedAt: now,
      createdAt: previousProgress?.createdAt ?? now,
      updatedAt: now,
    };
    const schedule: ReviewSchedule = {
      id: recordId,
      learnerId: input.learnerId,
      skillId: skillResult.skillId,
      moduleId: input.exercise.moduleId,
      itemId: input.exercise.contentId,
      focusId,
      scheduler: "ts-fsrs@5.4.2/fsrs-6",
      card,
      dueAt: card.due,
      updatedAt: now,
    };
    return { progress, schedule };
  }));
  await Promise.all(updates.flatMap(({ progress, schedule }) => [
    dependencies.progress.save(progress),
    dependencies.reviewSchedules.save(schedule),
  ]));
  return { result, attempt };
}
