import rawContent from "@/content/vocabulary/vocabulary.json";
import { vocabularyCollectionSchema, type VocabularyContent } from "@/content/vocabulary/schema";
import type { Answer, ExerciseType, LearningExercise, LearningItem, LearningModule } from "@/learning/contracts/module";
import { createExerciseId } from "@/learning/core/create-exercise-id";
import { isLevelAvailableAt } from "@/learning/core/preferences";
import { createFillGapSegments } from "@/learning/exercises/create-fill-gap-segments";
import { createMultipleChoiceOptions, selectDistinctDistractors } from "@/learning/exercises/create-multiple-choice-options";
import { evaluateFillGap } from "@/learning/exercises/evaluate-fill-gap";
import { evaluateMultipleChoice } from "@/learning/exercises/evaluate-multiple-choice";
import { evaluateTypedAnswer } from "@/learning/exercises/evaluate-typed-answer";

const collection = vocabularyCollectionSchema.parse(rawContent);
const itemById = new Map(collection.items.map((item) => [item.id, item]));

function getItem(itemId: string): VocabularyContent {
  const item = itemById.get(itemId);
  if (!item) throw new Error(`Unknown vocabulary content item: ${itemId}`);
  return item;
}

function vocabularyWord(item: VocabularyContent): string {
  return item.lemma.replace(/^(de|het)\s+/iu, "");
}

function getDistractors(item: VocabularyContent) {
  const candidates = collection.items
    .filter((candidate) => candidate.level === item.level && candidate.id !== item.id)
    .map((candidate) => ({ id: `option-${candidate.id}`, text: vocabularyWord(candidate) }));
  return selectDistinctDistractors(candidates, [vocabularyWord(item), ...item.acceptedVariants], 3);
}

function typesFor(item: VocabularyContent): ExerciseType[] {
  const types: ExerciseType[] = ["typed-answer"];
  if (getDistractors(item).length === 3) types.push("multiple-choice");
  if (createFillGapSegments(item.prompt.nl, vocabularyWord(item), "gap")) types.push("fill-gap");
  return types;
}

function commonFields(item: VocabularyContent, id: string, focusLabel: string) {
  return {
    id,
    moduleId: "vocabulary",
    contentId: item.id,
    skillId: `${item.id}:meaning`,
    level: item.level,
    focusId: "meaning",
    focusLabel,
    title: "Translate into Dutch",
  };
}

export const vocabularyModule: LearningModule = {
  id: "vocabulary",
  displayName: "Dutch vocabulary",
  i18nKey: "modules.vocabulary.title",
  supportedLevels: [...new Set(collection.items.map((item) => item.level))],
  exerciseFocuses: [{ id: "meaning", label: "Vocabulary" }],

  async loadItems(query): Promise<LearningItem[]> {
    return collection.items.filter((item) => !query?.level || isLevelAvailableAt(item.level, query.level)).map((item) => ({
      id: item.id,
      moduleId: item.moduleId,
      displayName: item.lemma,
      contentVersion: collection.contentVersion,
      level: item.level,
    }));
  },

  listSkills(itemId) {
    const item = getItem(itemId);
    return [{ skillId: `${item.id}:meaning`, focusId: "meaning" }];
  },

  supportedExerciseTypes(itemId) {
    return typesFor(getItem(itemId));
  },

  async createExercise(itemId, context): Promise<LearningExercise> {
    const item = getItem(itemId);
    const requestedType = context?.exerciseType ?? "typed-answer";
    const supportedTypes = typesFor(item);
    const id = createExerciseId();
    const focusLabel = "Vocabulary";
    const base = commonFields(item, id, focusLabel);

    if (requestedType === "multiple-choice" && supportedTypes.includes(requestedType)) {
      const correctOption = { id: `correct-${id}`, text: vocabularyWord(item) };
      return {
        ...base,
        type: "multiple-choice",
        prompt: item.prompt.en,
        answerLabel: "Choose the correct Dutch word",
        typoTolerance: "none",
        partialCredit: "none",
        ...createMultipleChoiceOptions(correctOption, getDistractors(item), context?.seed ?? id),
      };
    }

    if (requestedType === "fill-gap" && supportedTypes.includes(requestedType)) {
      const word = vocabularyWord(item);
      const blankId = `${id}-gap`;
      const segments = createFillGapSegments(item.prompt.nl, word, blankId);
      if (segments) {
        return {
          ...base,
          type: "fill-gap",
          prompt: item.prompt.en,
          answerLabel: "Fill in the missing Dutch word",
          typoTolerance: "one-edit",
          partialCredit: "graded",
          segments,
          blanks: [{ id: blankId, acceptedAnswers: [word] }],
        };
      }
    }

    return {
      ...base,
      type: "typed-answer",
      prompt: item.prompt.en,
      answerLabel: "Your answer in Dutch",
      typoTolerance: "one-edit",
      partialCredit: "graded",
      hint: item.explanation[context?.explanationLanguage ?? "en"],
      acceptedAnswers: [item.answer, ...item.acceptedVariants],
    };
  },

  async evaluate(exercise: LearningExercise, answer: Answer) {
    if (exercise.moduleId !== "vocabulary") throw new Error("The vocabulary module cannot evaluate another module's exercise.");
    if (exercise.type !== answer.type) throw new Error("Exercise and answer types must match.");
    switch (exercise.type) {
      case "typed-answer":
        if (answer.type !== "typed-answer") throw new Error("Exercise and answer types must match.");
        return evaluateTypedAnswer(exercise, answer);
      case "multiple-choice":
        if (answer.type !== "multiple-choice") throw new Error("Exercise and answer types must match.");
        return evaluateMultipleChoice(exercise, answer);
      case "fill-gap":
        if (answer.type !== "fill-gap") throw new Error("Exercise and answer types must match.");
        return evaluateFillGap(exercise, answer);
      default:
        throw new Error(`Exercise type ${exercise.type} is not implemented by the vocabulary module.`);
    }
  },
};
