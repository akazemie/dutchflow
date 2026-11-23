import type { ExplanationLanguage, LanguageLevel } from "@/learning/core/preferences";

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

export interface TypedAnswer {
  type: "typed-answer";
  value: string;
}

interface ExerciseByType {
  "typed-answer": TypedAnswerExercise;
}

interface AnswerByType {
  "typed-answer": TypedAnswer;
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
  title: string;
  answerLabel: string;
  prompt: string;
  hint?: string;
  acceptedAnswers: string[];
}

export type LearningExercise = ExerciseByType[keyof ExerciseByType];
export type Answer = AnswerByType[keyof AnswerByType];
export type ExerciseType = keyof ExerciseByType;

export type SchedulerRating = "again" | "hard" | "good" | "easy";

export interface EvaluationResult {
  correct: boolean;
  feedback: string;
  score: number;
  expected: string[];
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
  evaluate(exercise: LearningExercise, answer: Answer): Promise<EvaluationResult>;
}
