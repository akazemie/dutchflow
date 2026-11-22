import Dexie from "dexie";
import type { ReviewScheduleRepository } from "@/application/ports/review-schedule-repository";
import type { ReviewSchedule } from "@/learning/core/progress";
import { skillRecordId } from "@/learning/core/progress";
import type { DutchFlowDatabase } from "./database";

export class DexieReviewScheduleRepository implements ReviewScheduleRepository {
  constructor(private readonly db: DutchFlowDatabase) {}

  get(learnerId: string, skillId: string) {
    return this.db.reviewSchedules.get(skillRecordId(learnerId, skillId));
  }

  listDue(learnerId: string, dueAt: string) {
    return this.db.reviewSchedules
      .where("[learnerId+dueAt]")
      .between([learnerId, Dexie.minKey], [learnerId, dueAt], true, true)
      .toArray();
  }

  async save(schedule: ReviewSchedule) {
    await this.db.reviewSchedules.put(schedule);
  }
}
