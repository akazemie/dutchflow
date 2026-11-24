import type { ExerciseAttempt } from "@/application/ports/attempt-repository";
import type { AnswerRecorder } from "@/application/ports/answer-recorder";
import type { Answer, LearningExercise, LearningModule } from "@/learning/contracts/module";
import type { LearningSession } from "@/learning/core/session";
import type { ReviewScheduler } from "@/learning/scheduling/review-scheduler";
import { KNOWN_SCHEDULER_IDS } from "@/learning/scheduling/scheduler-identifiers";
import type { SkillProgress, ReviewSchedule } from "@/learning/core/progress";
import { advanceExerciseStage, getExerciseStage, skillRecordId } from "@/learning/core/progress";
import { createExerciseId } from "@/learning/core/create-exercise-id";

export interface SubmitAnswerInput {
  learnerId: string;
  session: LearningSession;
  module: LearningModule;
  exercise: LearningExercise;
  answer: Answer;
  durationMs?: number;
}

export async function submitAnswer(
  input: SubmitAnswerInput,
  dependencies: {
    answerRecorder: AnswerRecorder;
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
  if (input.session.learnerId !== input.learnerId) {
    throw new Error(`Learning session ${input.session.id} does not belong to learner ${input.learnerId}.`);
  }
  const attempt: ExerciseAttempt = {
    id: createId(),
    learnerId: input.learnerId,
    skillId: result.skillResults[0]!.skillId,
    skillIds: [...new Set(result.skillResults.map(({ skillId }) => skillId))],
    sessionId: input.session.id,
    contentId: input.exercise.contentId,
    moduleId: input.exercise.moduleId,
    exerciseType: input.exercise.type,
    answer: input.answer,
    correct: result.correct,
    rating: result.rating,
    durationMs: input.durationMs,
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
  await dependencies.answerRecorder.record({
    session: input.session,
    attempt,
    skillUpdates: skillResultsWithFocus.map(({ skillResult, focusId }) => ({
      learnerId: input.learnerId,
      skillId: skillResult.skillId,
      buildRecords(previousProgress, previousSchedule) {
        const recordId = skillRecordId(input.learnerId, skillResult.skillId);
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
          scheduler: KNOWN_SCHEDULER_IDS[0],
          card,
          dueAt: card.due,
          updatedAt: now,
        };
        return { progress, schedule };
      },
    })),
  });
  return { result, attempt };
}
