import type { PreferencesRepository } from "@/application/ports/preferences-repository";
import type { LearnerPreferenceChanges, LearnerPreferences } from "@/learning/core/preferences";
import { getPreferences } from "./get-preferences";

export async function updatePreferences(
  learnerId: string,
  changes: LearnerPreferenceChanges,
  dependencies: { preferences: PreferencesRepository; now?: () => Date },
): Promise<LearnerPreferences> {
  const current = await getPreferences(learnerId, dependencies);
  const updated: LearnerPreferences = {
    ...current,
    ...changes,
    updatedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
  };
  await dependencies.preferences.save(updated);
  return updated;
}
