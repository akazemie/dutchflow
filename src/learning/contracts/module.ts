export type ExerciseType = "typed-answer";

export interface LearningItem {
  id: string;
  moduleId: string;
  contentVersion: number;
  level: string;
}

export interface TypedAnswerExercise {
  id: string;
  type: "typed-answer";
  moduleId: string;
  contentId: string;
  skillId: string;
  level: string;
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
  loadItems(): Promise<LearningItem[]>;
  createExercise(itemId: string): Promise<LearningExercise>;
  evaluate(exercise: LearningExercise, answer: string): Promise<EvaluationResult>;
}
