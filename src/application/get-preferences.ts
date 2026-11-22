import type { PreferencesRepository } from "@/application/ports/preferences-repository";
import { DEFAULT_PREFERENCE_VALUES, type LearnerPreferences } from "@/learning/core/preferences";

export async function getPreferences(
  learnerId: string,
  dependencies: { preferences: PreferencesRepository; now?: () => Date },
): Promise<LearnerPreferences> {
  const existing = await dependencies.preferences.getByLearnerId(learnerId);
  if (existing) return existing;

  const now = (dependencies.now ?? (() => new Date()))().toISOString();
  const defaults: LearnerPreferences = {
    id: learnerId,
    learnerId,
    ...DEFAULT_PREFERENCE_VALUES,
    updatedAt: now,
  };
  await dependencies.preferences.save(defaults);
  return defaults;
}
