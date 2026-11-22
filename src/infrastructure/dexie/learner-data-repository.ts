import type { LearnerDataRepository, LearnerDataSnapshot } from "@/application/ports/learner-data-repository";
import type { DutchFlowDatabase } from "./database";

export class DexieLearnerDataRepository implements LearnerDataRepository {
  constructor(private readonly db: DutchFlowDatabase) {}

  async read(learnerId: string): Promise<LearnerDataSnapshot> {
    const [preferences, attempts, progress, reviewSchedules] = await Promise.all([
      this.db.learnerPreferences.where("learnerId").equals(learnerId).first(),
      this.db.exerciseAttempts.where("learnerId").equals(learnerId).toArray(),
      this.db.skillProgress.where("learnerId").equals(learnerId).toArray(),
      this.db.reviewSchedules.where("learnerId").equals(learnerId).toArray(),
    ]);
    return { preferences, attempts, progress, reviewSchedules };
  }

  async replace(learnerId: string, snapshot: LearnerDataSnapshot): Promise<void> {
    await this.db.transaction(
      "rw",
      this.db.learnerPreferences,
      this.db.exerciseAttempts,
      this.db.skillProgress,
      this.db.reviewSchedules,
      async () => {
        await Promise.all([
          this.db.learnerPreferences.where("learnerId").equals(learnerId).delete(),
          this.db.exerciseAttempts.where("learnerId").equals(learnerId).delete(),
          this.db.skillProgress.where("learnerId").equals(learnerId).delete(),
          this.db.reviewSchedules.where("learnerId").equals(learnerId).delete(),
        ]);
        await Promise.all([
          snapshot.preferences ? this.db.learnerPreferences.put(snapshot.preferences) : Promise.resolve(),
          snapshot.attempts.length ? this.db.exerciseAttempts.bulkPut(snapshot.attempts) : Promise.resolve(),
          snapshot.progress.length ? this.db.skillProgress.bulkPut(snapshot.progress) : Promise.resolve(),
          snapshot.reviewSchedules.length ? this.db.reviewSchedules.bulkPut(snapshot.reviewSchedules) : Promise.resolve(),
        ]);
      },
    );
  }
}
