export type ExerciseStage = 0 | 1 | 2;

export interface SkillProgress {
  id: string;
  learnerId: string;
  skillId: string;
  moduleId: string;
  itemId: string;
  focusId: string;
  attempts: number;
  correctAttempts: number;
  consecutiveCorrect: number;
  exerciseStage?: ExerciseStage;
  lastReviewedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSchedule {
  id: string;
  learnerId: string;
  skillId: string;
  moduleId: string;
  itemId: string;
  focusId: string;
  scheduler: "ts-fsrs@5.4.2/fsrs-6";
  card: {
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    learning_steps: number;
    reps: number;
    lapses: number;
    state: number;
    last_review: string | null;
  };
  dueAt: string;
  updatedAt: string;
}

export function skillRecordId(learnerId: string, skillId: string): string {
  return `${learnerId}:${skillId}`;
}

export function getExerciseStage(progress: SkillProgress | undefined): 0 | 1 | 2 {
  const stage = progress?.exerciseStage ?? Math.min(progress?.consecutiveCorrect ?? 0, 2);
  if (stage <= 0) return 0;
  if (stage === 1) return 1;
  if (stage >= 2) return 2;
  return 1;
}

export function advanceExerciseStage(stage: ExerciseStage, correct: boolean): ExerciseStage {
  if (correct) return stage === 0 ? 1 : 2;
  return stage === 2 ? 1 : 0;
}
