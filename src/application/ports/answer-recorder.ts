import type { ExerciseAttempt } from "./attempt-repository";
import type { ReviewSchedule, SkillProgress } from "@/learning/core/progress";

export interface AnswerSkillUpdate {
  learnerId: string;
  skillId: string;
  buildRecords: (
    previousProgress: SkillProgress | undefined,
    previousSchedule: ReviewSchedule | undefined,
  ) => { progress: SkillProgress; schedule: ReviewSchedule };
}

export interface AnswerRecorder {
  record(input: {
    attempt: ExerciseAttempt;
    skillUpdates: readonly AnswerSkillUpdate[];
  }): Promise<void>;
}
