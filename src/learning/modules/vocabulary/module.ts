import rawContent from "@/content/vocabulary/vocabulary.json";
import { vocabularyCollectionSchema, type VocabularyContent } from "@/content/vocabulary/schema";
import type { Answer, ExerciseType, LearningExercise, LearningItem, LearningModule } from "@/learning/contracts/module";
import type { TypoTolerance } from "@/learning/contracts/module";
import { message } from "@/learning/contracts/message";
import { createExerciseId } from "@/learning/core/create-exercise-id";
import { normalizeAnswer } from "@/learning/core/normalize-answer";
import { isLevelAvailableAt } from "@/learning/core/preferences";
import { createFillGapSegments } from "@/learning/exercises/create-fill-gap-segments";
import { createMultipleChoiceOptions, selectDistinctDistractors } from "@/learning/exercises/create-multiple-choice-options";
import { createWordOrderingFields, supportsWordOrdering } from "@/learning/exercises/create-word-ordering-exercise";
import { evaluateFillGap } from "@/learning/exercises/evaluate-fill-gap";
import { evaluateMultipleChoice } from "@/learning/exercises/evaluate-multiple-choice";
import { evaluateTypedAnswer } from "@/learning/exercises/evaluate-typed-answer";
import { evaluateWordOrdering } from "@/learning/exercises/evaluate-word-ordering";
import { isAlmostAnswer } from "@/learning/exercises/evaluate-almost-answer";

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

function isAlmostVocabularyAnswer(
  answer: string,
  acceptedAnswers: readonly string[],
  noun: string,
  typoTolerance: TypoTolerance,
): boolean {
  const expectedNounTokens = normalizeAnswer(noun).split(/\s+/u);
  if (expectedNounTokens.some((token) => !token)) return false;

  return acceptedAnswers.some((acceptedAnswer) => {
    const expectedTokens = normalizeAnswer(acceptedAnswer).split(/\s+/u);
    const matchingStarts = expectedTokens.flatMap((_, index) =>
      expectedNounTokens.every((token, offset) => expectedTokens[index + offset] === token) ? [index] : [],
    );
    if (matchingStarts.length !== 1) return false;

    const start = matchingStarts[0]!;
    const end = start + expectedNounTokens.length;
    const answerTokens = normalizeAnswer(answer).split(/\s+/u);
    if (answerTokens.length !== expectedTokens.length) return false;
    if (answerTokens.some((token, index) =>
      (index < start || index >= end) && token !== expectedTokens[index],
    )) return false;

    return isAlmostAnswer(
      answerTokens.slice(start, end).join(" "),
      [expectedTokens.slice(start, end).join(" ")],
      typoTolerance,
    );
  });
}

function getDistractors(item: VocabularyContent) {
  const answerWords = new Set(
    [item.answer, ...item.acceptedVariants]
      .flatMap((sentence) => normalizeAnswer(sentence).split(/\s+/u)),
  );
  const candidates = collection.items
    .filter((candidate) => candidate.level === item.level && candidate.id !== item.id)
    .map((candidate) => ({ id: `option-${candidate.id}`, text: vocabularyWord(candidate) }))
    .filter((candidate) => !answerWords.has(normalizeAnswer(candidate.text)));
  return selectDistinctDistractors(candidates, [vocabularyWord(item), ...item.acceptedVariants], 3);
}

function typesFor(item: VocabularyContent): ExerciseType[] {
  const types: ExerciseType[] = ["typed-answer"];
  if (getDistractors(item).length === 3) types.push("multiple-choice");
  if (createFillGapSegments(item.prompt.nl, vocabularyWord(item), "gap")) types.push("fill-gap");
  if (supportsWordOrdering(item.answer)) types.push("word-ordering");
  return types;
}

function commonFields(item: VocabularyContent, id: string) {
  return {
    id,
    moduleId: "vocabulary",
    contentId: item.id,
    skillId: `${item.id}:meaning`,
    level: item.level,
    focusId: "meaning",
    focusLabel: message("focus.vocabulary"),
    title: message("exercise.title.translate"),
  };
}

export const vocabularyModule: LearningModule = {
  id: "vocabulary",
  displayName: "Dutch vocabulary",
  i18nKey: "modules.vocabulary.title",
  supportedLevels: [...new Set(collection.items.map((item) => item.level))],
  exerciseFocuses: [{ id: "meaning", label: message("focus.vocabulary") }],

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
    const base = commonFields(item, id);

    if (requestedType === "multiple-choice" && supportedTypes.includes(requestedType)) {
      const correctOption = { id: `correct-${id}`, text: vocabularyWord(item) };
      return {
        ...base,
        type: "multiple-choice",
        prompt: item.prompt.en,
        answerLabel: message("exercise.answer.chooseDutchWord"),
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
          answerLabel: message("exercise.answer.fillDutchWord"),
          typoTolerance: "one-edit",
          partialCredit: "graded",
          segments,
          blanks: [{ id: blankId, acceptedAnswers: [word] }],
        };
      }
    }

    if (requestedType === "word-ordering" && supportedTypes.includes(requestedType)) {
      const fields = createWordOrderingFields(
        item.answer,
        item.acceptedVariants,
        id,
        context?.seed,
      );
      if (fields) {
        return {
          ...base,
          type: "word-ordering",
          prompt: item.prompt.en,
          title: message("exercise.title.buildSentence"),
          answerLabel: message("exercise.answer.orderSentence"),
          typoTolerance: "none",
          partialCredit: "none",
          ...fields,
        };
      }
    }

    return {
      ...base,
      type: "typed-answer",
      prompt: item.prompt.en,
      answerLabel: message("exercise.answer.yourDutch"),
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
        return evaluateTypedAnswer(exercise, answer, {
          isAlmostAnswer: (submitted, accepted, typoTolerance) =>
            isAlmostVocabularyAnswer(submitted, accepted, vocabularyWord(getItem(exercise.contentId)), typoTolerance),
        });
      case "multiple-choice":
        if (answer.type !== "multiple-choice") throw new Error("Exercise and answer types must match.");
        return evaluateMultipleChoice(exercise, answer);
      case "fill-gap":
        if (answer.type !== "fill-gap") throw new Error("Exercise and answer types must match.");
        return evaluateFillGap(exercise, answer);
      case "word-ordering":
        if (answer.type !== "word-ordering") throw new Error("Exercise and answer types must match.");
        return evaluateWordOrdering(exercise, answer);
      default:
        throw new Error(`Exercise type ${exercise.type} is not implemented by the vocabulary module.`);
    }
  },
};
