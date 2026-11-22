import type { PreferencesRepository } from "@/application/ports/preferences-repository";
import type { LearnerPreferences } from "@/learning/core/preferences";
import type { DutchFlowDatabase } from "./database";

export class DexiePreferencesRepository implements PreferencesRepository {
  constructor(private readonly db: DutchFlowDatabase) {}

  getByLearnerId(learnerId: string): Promise<LearnerPreferences | undefined> {
    return this.db.learnerPreferences.where("learnerId").equals(learnerId).first();
  }

  async save(preferences: LearnerPreferences): Promise<void> {
    await this.db.learnerPreferences.put(preferences);
  }
}
