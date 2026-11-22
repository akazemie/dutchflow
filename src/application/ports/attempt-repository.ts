export interface ExerciseAttempt {
  id: string;
  learnerId: string;
  skillId: string;
  contentId: string;
  moduleId: string;
  exerciseType: string;
  answer: string;
  correct: boolean;
  rating: "again" | "hard" | "good" | "easy";
  createdAt: string;
  updatedAt: string;
}

export interface AttemptRepository {
  save(attempt: ExerciseAttempt): Promise<void>;
}
