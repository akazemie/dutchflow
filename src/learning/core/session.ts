import type { ExerciseType } from "@/learning/contracts/module";
import type { ExerciseStrategy, LanguageLevel } from "./preferences";

export interface LearningSession {
  id: string;
  learnerId: string;
  moduleId: string;
  startedAt: string;
  completedAt?: string;
  strategy: ExerciseStrategy;
  preferences: {
    level: LanguageLevel;
    dailyLearningMinutes: number;
  };
  plannedSkillIds: string[];
  plannedExerciseTypes: ExerciseType[];
}
