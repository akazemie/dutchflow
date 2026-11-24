import type { Answer } from "@/learning/contracts/module";

export interface ExerciseAttempt {
  id: string;
  learnerId: string;
  skillId: string;
  skillIds: string[];
  sessionId: string | null;
  contentId: string;
  moduleId: string;
  exerciseType: string;
  answer: Answer;
  correct: boolean;
  rating: "again" | "hard" | "good" | "easy";
  durationMs?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredExerciseAttempt extends Omit<ExerciseAttempt, "answer" | "skillIds" | "sessionId"> {
  answer: Answer | string;
  skillIds?: string[];
  sessionId?: string | null;
}

export interface AttemptRepository {
  listByLearner(learnerId: string): Promise<ExerciseAttempt[]>;
}
