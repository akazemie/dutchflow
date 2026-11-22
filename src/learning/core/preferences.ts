export const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const EXPLANATION_LANGUAGES = ["en", "nl", "fa"] as const;
export const EXERCISE_STRATEGIES = ["balanced", "review-first", "new-first"] as const;

export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];
export type ExplanationLanguage = (typeof EXPLANATION_LANGUAGES)[number];
export type ExerciseStrategy = (typeof EXERCISE_STRATEGIES)[number];

export interface LearnerPreferences {
  id: string;
  learnerId: string;
  level: LanguageLevel;
  explanationLanguage: ExplanationLanguage;
  exerciseStrategy: ExerciseStrategy;
  dailyLearningMinutes: number;
  updatedAt: string;
}

export type LearnerPreferenceChanges = Pick<
  LearnerPreferences,
  "level" | "explanationLanguage" | "exerciseStrategy" | "dailyLearningMinutes"
>;

export const DEFAULT_PREFERENCE_VALUES: LearnerPreferenceChanges = {
  level: "A1",
  explanationLanguage: "en",
  exerciseStrategy: "balanced",
  dailyLearningMinutes: 10,
};

export function isLevelAvailableAt(level: LanguageLevel, selectedLevel: LanguageLevel): boolean {
  return LANGUAGE_LEVELS.indexOf(level) <= LANGUAGE_LEVELS.indexOf(selectedLevel);
}
