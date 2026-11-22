import type { ProgressRepository } from "@/application/ports/progress-repository";
import type { SkillProgress } from "@/learning/core/progress";
import { skillRecordId } from "@/learning/core/progress";
import type { DutchFlowDatabase } from "./database";

export class DexieProgressRepository implements ProgressRepository {
  constructor(private readonly db: DutchFlowDatabase) {}

  get(learnerId: string, skillId: string) {
    return this.db.skillProgress.get(skillRecordId(learnerId, skillId));
  }

  listByLearner(learnerId: string) {
    return this.db.skillProgress.where("learnerId").equals(learnerId).toArray();
  }

  async save(progress: SkillProgress) {
    await this.db.skillProgress.put(progress);
  }
}
