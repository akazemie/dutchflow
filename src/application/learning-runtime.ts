import type { Answer, EvaluationResult, LearningExercise, LearningModule } from "@/learning/contracts/module";
import type { LearnerPreferenceChanges, LearnerPreferences } from "@/learning/core/preferences";
import type { PreparedLearningSession } from "./start-session";
import type { ExerciseAttempt } from "./ports/attempt-repository";
import type { SkillProgress } from "@/learning/core/progress";
import type { ReviewSchedule } from "@/learning/core/progress";

export interface LearningRuntime {
  loadLearningModule(moduleId: string): Promise<LearningModule>;
  getPreferences(): Promise<LearnerPreferences>;
  updatePreferences(changes: LearnerPreferenceChanges): Promise<LearnerPreferences>;
  getProgress(): Promise<SkillProgress[]>;
  getDueReviews(): Promise<ReviewSchedule[]>;
  exportData(): Promise<string>;
  importData(serialized: string): Promise<void>;
  createSession(moduleId: string): Promise<PreparedLearningSession>;
  submitAnswer(input: { exercise: LearningExercise; answer: Answer }): Promise<{
    result: EvaluationResult;
    attempt: ExerciseAttempt;
  }>;
}
