import type { ExerciseAttempt } from "./attempt-repository";
import type { LearnerPreferences } from "@/learning/core/preferences";
import type { ReviewSchedule, SkillProgress } from "@/learning/core/progress";
import type { LearningSession } from "@/learning/core/session";

export interface LearnerDataSnapshot {
  preferences?: LearnerPreferences;
  attempts: ExerciseAttempt[];
  progress: SkillProgress[];
  reviewSchedules: ReviewSchedule[];
  sessions: LearningSession[];
}

export interface LearnerDataRepository {
  read(learnerId: string): Promise<LearnerDataSnapshot>;
  replace(learnerId: string, snapshot: LearnerDataSnapshot): Promise<void>;
}
