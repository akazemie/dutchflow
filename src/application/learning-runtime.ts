import type { LearningExercise, LearningModule } from "@/learning/contracts/module";
import type { LearnerPreferenceChanges, LearnerPreferences } from "@/learning/core/preferences";
import type { PreparedLearningSession } from "./start-session";
import type { ExerciseAttempt } from "./ports/attempt-repository";
import type { SkillProgress } from "@/learning/core/progress";

export interface LearningRuntime {
  loadLearningModule(moduleId: string): Promise<LearningModule>;
  getPreferences(): Promise<LearnerPreferences>;
  updatePreferences(changes: LearnerPreferenceChanges): Promise<LearnerPreferences>;
  getProgress(): Promise<SkillProgress[]>;
  createSession(moduleId: string): Promise<PreparedLearningSession>;
  submitAnswer(input: { exercise: LearningExercise; answer: string }): Promise<{
    result: { correct: boolean; feedback: string; rating: "again" | "hard" | "good" | "easy"; skillIds: string[] };
    attempt: ExerciseAttempt;
  }>;
}
