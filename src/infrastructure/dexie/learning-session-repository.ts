import type { LearningSessionRepository } from "@/application/ports/learning-session-repository";
import type { LearningSession } from "@/learning/core/session";
import type { DutchFlowDatabase } from "./database";

export class DexieLearningSessionRepository implements LearningSessionRepository {
  constructor(private readonly db: DutchFlowDatabase) {}

  async save(session: LearningSession): Promise<void> {
    await this.db.learningSessions.put(session);
  }

  async complete(learnerId: string, sessionId: string, completedAt: string): Promise<void> {
    await this.db.transaction("rw", this.db.learningSessions, async () => {
      const session = await this.db.learningSessions.get(sessionId);
      if (!session || session.learnerId !== learnerId) {
        throw new Error(`Learning session ${sessionId} was not found for learner ${learnerId}.`);
      }
      await this.db.learningSessions.update(sessionId, { completedAt });
    });
  }
}
