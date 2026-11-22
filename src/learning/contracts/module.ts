import type { ExplanationLanguage, LanguageLevel } from "@/learning/core/preferences";

export type ExerciseType = "typed-answer";

export interface LearningItem {
  id: string;
  moduleId: string;
  displayName: string;
  contentVersion: number;
  level: string;
}

export interface ExerciseFocus {
  id: string;
  label: string;
}

export interface ExerciseContext {
  focusId?: string;
  explanationLanguage?: ExplanationLanguage;
}

export interface TypedAnswerExercise {
  id: string;
  type: "typed-answer";
  moduleId: string;
  contentId: string;
  skillId: string;
  level: string;
  focusId: string;
  focusLabel: string;
  prompt: string;
  hint?: string;
  acceptedAnswers: string[];
}

export type LearningExercise = TypedAnswerExercise;

export type SchedulerRating = "again" | "hard" | "good" | "easy";

export interface EvaluationResult {
  correct: boolean;
  feedback: string;
  rating: SchedulerRating;
  skillIds: string[];
}

export interface LearningModule {
  id: string;
  displayName: string;
  i18nKey: string;
  supportedLevels: string[];
  exerciseFocuses: ExerciseFocus[];
  loadItems(query?: { level?: LanguageLevel }): Promise<LearningItem[]>;
  createExercise(itemId: string, context?: ExerciseContext): Promise<LearningExercise>;
  evaluate(exercise: LearningExercise, answer: string): Promise<EvaluationResult>;
}
