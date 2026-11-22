import type { AttemptRepository, ExerciseAttempt } from "@/application/ports/attempt-repository";
import type { DutchFlowDatabase } from "./database";

export class DexieAttemptRepository implements AttemptRepository {
  constructor(private readonly db: DutchFlowDatabase) {}

  async save(attempt: ExerciseAttempt): Promise<void> {
    await this.db.exerciseAttempts.put(attempt);
  }
}
