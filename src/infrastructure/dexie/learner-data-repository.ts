import type { LearnerDataRepository, LearnerDataSnapshot } from "@/application/ports/learner-data-repository";
import type { DutchFlowDatabase } from "./database";
import { DexieAttemptRepository } from "./attempt-repository";

export class DexieLearnerDataRepository implements LearnerDataRepository {
  constructor(private readonly db: DutchFlowDatabase) {}

  async read(learnerId: string): Promise<LearnerDataSnapshot> {
    const [preferences, attempts, progress, reviewSchedules, sessions] = await Promise.all([
      this.db.learnerPreferences.where("learnerId").equals(learnerId).first(),
      new DexieAttemptRepository(this.db).listByLearner(learnerId),
      this.db.skillProgress.where("learnerId").equals(learnerId).toArray(),
      this.db.reviewSchedules.where("learnerId").equals(learnerId).toArray(),
      this.db.learningSessions.where("learnerId").equals(learnerId).toArray(),
    ]);
    return { preferences, attempts, progress, reviewSchedules, sessions };
  }

  async replace(learnerId: string, snapshot: LearnerDataSnapshot): Promise<void> {
    await this.db.transaction(
      "rw",
      this.db.learnerPreferences,
      this.db.exerciseAttempts,
      this.db.skillProgress,
      this.db.reviewSchedules,
      this.db.learningSessions,
      async () => {
        await this.db.learnerPreferences.where("learnerId").equals(learnerId).delete();
        await this.db.exerciseAttempts.where("learnerId").equals(learnerId).delete();
        await this.db.skillProgress.where("learnerId").equals(learnerId).delete();
        await this.db.reviewSchedules.where("learnerId").equals(learnerId).delete();
        await this.db.learningSessions.where("learnerId").equals(learnerId).delete();

        if (snapshot.preferences) await this.db.learnerPreferences.put(snapshot.preferences);
        if (snapshot.attempts.length) await this.db.exerciseAttempts.bulkPut(snapshot.attempts);
        if (snapshot.progress.length) await this.db.skillProgress.bulkPut(snapshot.progress);
        if (snapshot.reviewSchedules.length) await this.db.reviewSchedules.bulkPut(snapshot.reviewSchedules);
        if (snapshot.sessions.length) await this.db.learningSessions.bulkPut(snapshot.sessions);
      },
    );
  }
}
