import type { AnswerRecorder } from "@/application/ports/answer-recorder";
import { skillRecordId } from "@/learning/core/progress";
import type { DutchFlowDatabase } from "./database";

export class DexieAnswerRecorder implements AnswerRecorder {
  constructor(private readonly db: DutchFlowDatabase) {}

  async record(input: Parameters<AnswerRecorder["record"]>[0]): Promise<void> {
    await this.db.transaction(
      "rw",
      this.db.exerciseAttempts,
      this.db.skillProgress,
      this.db.reviewSchedules,
      this.db.learningSessions,
      async () => {
        if (input.session.id !== input.attempt.sessionId
          || input.session.learnerId !== input.attempt.learnerId
          || input.session.moduleId !== input.attempt.moduleId) {
          throw new Error("Attempt and learning session details must match.");
        }
        const existingSession = await this.db.learningSessions.get(input.session.id);
        if (existingSession && (
          existingSession.learnerId !== input.session.learnerId
          || existingSession.moduleId !== input.session.moduleId
        )) {
          throw new Error(`Learning session ${input.session.id} does not match the submitted answer.`);
        }
        if (!existingSession) await this.db.learningSessions.add(input.session);
        await this.db.exerciseAttempts.add(input.attempt);
        for (const update of input.skillUpdates) {
          const recordId = skillRecordId(update.learnerId, update.skillId);
          const [previousProgress, previousSchedule] = await Promise.all([
            this.db.skillProgress.get(recordId),
            this.db.reviewSchedules.get(recordId),
          ]);
          const records = update.buildRecords(previousProgress, previousSchedule);
          await this.db.skillProgress.put(records.progress);
          await this.db.reviewSchedules.put(records.schedule);
        }
      },
    );
  }
}
