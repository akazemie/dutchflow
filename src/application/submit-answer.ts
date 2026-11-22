import type { AttemptRepository, ExerciseAttempt } from "@/application/ports/attempt-repository";
import type { LearningExercise, LearningModule } from "@/learning/contracts/module";

export interface SubmitAnswerInput {
  learnerId: string;
  module: LearningModule;
  exercise: LearningExercise;
  answer: string;
}

export async function submitAnswer(
  input: SubmitAnswerInput,
  dependencies: {
    attempts: AttemptRepository;
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
  return { result, attempt };
}
