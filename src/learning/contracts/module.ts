import type { ExplanationLanguage, LanguageLevel } from "@/learning/core/preferences";

export type TypoTolerance = "none" | "one-edit";
export type PartialCredit = "none" | "graded";

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

export interface LearningSkill {
  skillId: string;
  focusId: string;
}

export interface ExerciseContext {
  focusId?: string;
  explanationLanguage?: ExplanationLanguage;
  exerciseType?: ExerciseType;
  seed?: string;
}

interface BaseExercise {
  id: string;
  moduleId: string;
  contentId: string;
  skillId: string;
  level: string;
  focusId: string;
  focusLabel: string;
  title: string;
  answerLabel: string;
  typoTolerance: TypoTolerance;
  partialCredit: PartialCredit;
  hint?: string;
}

export interface TypedAnswerExercise extends BaseExercise {
  type: "typed-answer";
  prompt: string;
  acceptedAnswers: string[];
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: "multiple-choice";
  prompt: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
}

export type FillGapSegment =
  | { id: string; type: "text"; text: string }
  | { type: "blank"; blankId: string };

export interface FillGapExercise extends BaseExercise {
  type: "fill-gap";
  prompt: string;
  segments: FillGapSegment[];
  blanks: Array<{ id: string; acceptedAnswers: string[] }>;
}

export interface WordOrderingExercise extends BaseExercise {
  type: "word-ordering";
  prompt: string;
  tokens: Array<{ id: string; text: string }>;
  acceptedOrders: string[][];
}

export interface MatchingExercise extends BaseExercise {
  type: "matching";
  pairs: Array<{ id: string; left: string; right: string; skillId: string }>;
  rightOrder: string[];
}

export interface ExerciseByType {
  "typed-answer": TypedAnswerExercise;
  "multiple-choice": MultipleChoiceExercise;
  "fill-gap": FillGapExercise;
  "word-ordering": WordOrderingExercise;
  matching: MatchingExercise;
}

export interface TypedAnswer {
  type: "typed-answer";
  value: string;
}

export interface MultipleChoiceAnswer {
  type: "multiple-choice";
  optionId: string;
}

export interface FillGapAnswer {
  type: "fill-gap";
  values: Record<string, string>;
}

export interface WordOrderingAnswer {
  type: "word-ordering";
  tokenIds: string[];
}

export interface MatchingAnswer {
  type: "matching";
  matches: Record<string, string>;
}

export interface AnswerByType {
  "typed-answer": TypedAnswer;
  "multiple-choice": MultipleChoiceAnswer;
  "fill-gap": FillGapAnswer;
  "word-ordering": WordOrderingAnswer;
  matching: MatchingAnswer;
}

export type LearningExercise = ExerciseByType[keyof ExerciseByType];
export type Answer = AnswerByType[keyof AnswerByType];
export type ExerciseType = keyof ExerciseByType;
export type ExerciseOfType<T extends ExerciseType> = ExerciseByType[T];
export type AnswerOfType<T extends ExerciseType> = AnswerByType[T];

export type SchedulerRating = "again" | "hard" | "good" | "easy";

export interface SkillResult {
  skillId: string;
  correct: boolean;
  rating: SchedulerRating;
}

export interface ExerciseItemResult {
  itemId: string;
  correct: boolean;
  expected: string[];
}

export interface EvaluationResult {
  correct: boolean;
  feedback: string;
  score: number;
  expected: string[];
  rating: SchedulerRating;
  skillIds: string[];
  skillResults: SkillResult[];
  itemResults?: ExerciseItemResult[];
}

export interface LearningModule {
  id: string;
  displayName: string;
  i18nKey: string;
  supportedLevels: string[];
  exerciseFocuses: ExerciseFocus[];
  loadItems(query?: { level?: LanguageLevel }): Promise<LearningItem[]>;
  listSkills(itemId: string): LearningSkill[];
  supportedExerciseTypes(itemId: string, focusId: string): ExerciseType[];
  createExercise(itemId: string, context?: ExerciseContext): Promise<LearningExercise>;
  evaluate(exercise: LearningExercise, answer: Answer): Promise<EvaluationResult>;
}
