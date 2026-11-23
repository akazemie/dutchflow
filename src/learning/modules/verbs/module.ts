import rawVerbContent from "@/content/verbs/verbs.json";
import { verbCollectionSchema, type VerbContent } from "@/content/verbs/schema";
import type { Answer, ExerciseFocus, ExerciseType, LearningExercise, LearningItem, LearningModule } from "@/learning/contracts/module";
import { isLevelAvailableAt } from "@/learning/core/preferences";
import { evaluateFillGap } from "@/learning/exercises/evaluate-fill-gap";
import { evaluateMultipleChoice } from "@/learning/exercises/evaluate-multiple-choice";
import { evaluateTypedAnswer } from "@/learning/exercises/evaluate-typed-answer";
import {
  createVerbFillGap,
  createVerbMultipleChoice,
  createVerbTypedAnswer,
  getVerbDistractors,
  getVerbPrompt,
  verbSkills,
} from "./exercise-generation";

const verbCollection = verbCollectionSchema.parse(rawVerbContent);
const verbsById = new Map(verbCollection.items.map((item) => [item.id, item]));
const exerciseFocuses: ExerciseFocus[] = [
  { id: "perfectum", label: "Perfectum" },
  { id: "imperfectum-singular", label: "Imperfectum · singular" },
  { id: "imperfectum-plural", label: "Imperfectum · plural" },
];

function getVerb(itemId: string): VerbContent {
  const verb = verbsById.get(itemId);
  if (!verb) throw new Error(`Unknown verb content item: ${itemId}`);
  return verb;
}

function typesFor(verb: VerbContent, focusId: string): ExerciseType[] {
  const prompt = getVerbPrompt(verb, focusId, exerciseFocuses);
  const types: ExerciseType[] = ["typed-answer"];
  if (getVerbDistractors(verb, focusId, prompt).length >= 3) types.push("multiple-choice");
  if (createVerbFillGap(verb, focusId, prompt, "en")) types.push("fill-gap");
  return types;
}

export const verbsModule: LearningModule = {
  id: "verbs",
  displayName: "Dutch verbs",
  i18nKey: "modules.verbs.title",
  exerciseFocuses,
  supportedLevels: [...new Set(verbCollection.items.map((verb) => verb.level))],

  async loadItems(query): Promise<LearningItem[]> {
    return verbCollection.items.filter((verb) => !query?.level || isLevelAvailableAt(verb.level, query.level)).map((verb) => ({
      id: verb.id,
      moduleId: verb.moduleId,
      displayName: verb.lemma,
      contentVersion: verbCollection.contentVersion,
      level: verb.level,
    }));
  },

  listSkills(itemId) {
    return verbSkills(getVerb(itemId), exerciseFocuses);
  },

  supportedExerciseTypes(itemId, focusId) {
    const verb = getVerb(itemId);
    if (focusId !== "perfectum" && focusId !== "imperfectum-singular" && focusId !== "imperfectum-plural") {
      throw new Error(`Unknown verb exercise focus: ${focusId}`);
    }
    return typesFor(verb, focusId);
  },

  async createExercise(itemId, context): Promise<LearningExercise> {
    const verb = getVerb(itemId);
    const focusId = context?.focusId ?? "perfectum";
    const prompt = getVerbPrompt(verb, focusId, exerciseFocuses);
    const explanationLanguage = context?.explanationLanguage ?? "en";
    const requestedType = context?.exerciseType ?? "typed-answer";
    const supportedTypes = typesFor(verb, focusId);

    if (requestedType === "multiple-choice" && supportedTypes.includes(requestedType)) {
      const exercise = createVerbMultipleChoice(verb, focusId, prompt, context?.seed, explanationLanguage);
      if (exercise) return exercise;
    }
    if (requestedType === "fill-gap" && supportedTypes.includes(requestedType)) {
      const exercise = createVerbFillGap(verb, focusId, prompt, explanationLanguage);
      if (exercise) return exercise;
    }
    return createVerbTypedAnswer(verb, focusId, prompt, explanationLanguage);
  },

  async evaluate(exercise: LearningExercise, answer: Answer) {
    if (exercise.moduleId !== "verbs") throw new Error("The verbs module cannot evaluate another module's exercise.");
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
        throw new Error(`Exercise type ${exercise.type} is not implemented by the verbs module.`);
    }
  },
};
