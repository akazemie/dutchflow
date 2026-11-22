import rawVerbContent from "@/content/verbs/verbs.json";
import { verbCollectionSchema, type VerbContent } from "@/content/verbs/schema";
import type { EvaluationResult, ExerciseFocus, LearningExercise, LearningItem, LearningModule } from "@/learning/contracts/module";
import { normalizeAnswer } from "@/learning/core/normalize-answer";
import { isLevelAvailableAt } from "@/learning/core/preferences";

const verbCollection = verbCollectionSchema.parse(rawVerbContent);
const verbsById = new Map(verbCollection.items.map((item) => [item.id, item]));
const exerciseFocuses: ExerciseFocus[] = [
  { id: "perfectum", label: "Perfectum" },
  { id: "imperfectum-singular", label: "Imperfectum · singular" },
  { id: "imperfectum-plural", label: "Imperfectum · plural" },
];

function exerciseForVerb(verb: VerbContent, focusId: string, explanationLanguage: "en" | "nl" | "fa"): LearningExercise {
  let example: { en: string; nl: string; acceptedVariants?: string[] };
  let focusLabel: string;
  let skillId: string;

  if (focusId === "perfectum") {
    const selected = verb.forms.perfectum.examples[0];
    if (!selected) throw new Error(`Verb ${verb.id} has no Perfectum example.`);
    example = selected;
    focusLabel = "Perfectum";
    skillId = `${verb.id}:perfectum`;
  } else if (focusId === "imperfectum-singular" || focusId === "imperfectum-plural") {
    const person = focusId === "imperfectum-singular" ? "singular" : "plural";
    example = verb.forms.imperfectum.examples[person];
    focusLabel = `Imperfectum · ${person}`;
    skillId = `${verb.id}:imperfectum:${person}`;
  } else {
    throw new Error(`Unknown verb exercise focus: ${focusId}`);
  }

  return {
    id: crypto.randomUUID(),
    type: "typed-answer",
    moduleId: "verbs",
    contentId: verb.id,
    skillId,
    level: verb.level,
    focusId,
    focusLabel,
    prompt: example.en,
    hint: verb.explanation[explanationLanguage],
    acceptedAnswers: [example.nl, ...(example.acceptedVariants ?? [])],
  };
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

  async createExercise(itemId: string, context): Promise<LearningExercise> {
    const verb = verbsById.get(itemId);
    if (!verb) throw new Error(`Unknown verb content item: ${itemId}`);
    return exerciseForVerb(verb, context?.focusId ?? "perfectum", context?.explanationLanguage ?? "en");
  },

  async evaluate(exercise: LearningExercise, answer: string): Promise<EvaluationResult> {
    const expected = exercise.acceptedAnswers.map(normalizeAnswer);
    const correct = normalizeAnswer(answer).length > 0 && expected.includes(normalizeAnswer(answer));

    return {
      correct,
      feedback: correct
        ? `Correct. ${exercise.acceptedAnswers[0]} is a correct ${exercise.focusLabel.toLocaleLowerCase("en-US")} form.`
        : `Not quite. One accepted answer is: ${exercise.acceptedAnswers[0]}`,
      rating: correct ? "good" : "again",
      skillIds: [exercise.skillId],
    };
  },
};
