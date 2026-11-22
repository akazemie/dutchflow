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
