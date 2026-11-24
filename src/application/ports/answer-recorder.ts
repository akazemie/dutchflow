import type { ExerciseAttempt } from "./attempt-repository";
import type { ReviewSchedule, SkillProgress } from "@/learning/core/progress";
import type { LearningSession } from "@/learning/core/session";

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
    session: LearningSession;
    attempt: ExerciseAttempt;
    skillUpdates: readonly AnswerSkillUpdate[];
  }): Promise<void>;
}
