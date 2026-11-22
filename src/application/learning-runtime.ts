import type { LearningExercise, LearningModule } from "@/learning/contracts/module";
import type { ExerciseAttempt } from "./ports/attempt-repository";

export interface LearningRuntime {
  loadLearningModule(moduleId: string): Promise<LearningModule>;
  submitAnswer(input: { exercise: LearningExercise; answer: string }): Promise<{
    result: { correct: boolean; feedback: string; rating: "again" | "hard" | "good" | "easy"; skillIds: string[] };
    attempt: ExerciseAttempt;
  }>;
}
