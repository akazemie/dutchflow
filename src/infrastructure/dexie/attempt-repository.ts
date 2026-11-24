import type {
  AttemptRepository,
  ExerciseAttempt,
  StoredExerciseAttempt,
} from "@/application/ports/attempt-repository";
import type { DutchFlowDatabase } from "./database";

function normalizeAttempt(attempt: StoredExerciseAttempt): ExerciseAttempt {
  return {
    ...attempt,
    answer: typeof attempt.answer === "string"
      ? { type: "typed-answer", value: attempt.answer }
      : attempt.answer,
    skillIds: attempt.skillIds ?? [attempt.skillId],
    sessionId: attempt.sessionId ?? null,
  };
}

export class DexieAttemptRepository implements AttemptRepository {
  constructor(private readonly db: DutchFlowDatabase) {}

  async listByLearner(learnerId: string): Promise<ExerciseAttempt[]> {
    const attempts = await this.db.exerciseAttempts.where("learnerId").equals(learnerId).toArray();
    return attempts.map(normalizeAttempt);
  }

  async listSince(learnerId: string, createdAt: string): Promise<ExerciseAttempt[]> {
    const attempts = await this.db.exerciseAttempts
      .where("createdAt")
      .aboveOrEqual(createdAt)
      .filter((attempt) => attempt.learnerId === learnerId)
      .toArray();
    return attempts.map(normalizeAttempt);
  }
}
