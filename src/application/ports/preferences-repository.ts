import type { LearnerPreferences } from "@/learning/core/preferences";

export interface PreferencesRepository {
  getByLearnerId(learnerId: string): Promise<LearnerPreferences | undefined>;
  save(preferences: LearnerPreferences): Promise<void>;
}
