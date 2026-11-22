import rawVerbContent from "@/content/verbs/verbs.json";
import { verbCollectionSchema, type VerbContent } from "@/content/verbs/schema";
import type { EvaluationResult, LearningExercise, LearningItem, LearningModule } from "@/learning/contracts/module";
import { normalizeAnswer } from "./normalize-answer";

const verbCollection = verbCollectionSchema.parse(rawVerbContent);
const verbsById = new Map(verbCollection.items.map((item) => [item.id, item]));
function exerciseForVerb(verb: VerbContent): LearningExercise {
  const example = verb.forms.perfectum.examples[0];
  if (!example) throw new Error(`Verb ${verb.id} has no Perfectum example.`);

  return {
    id: crypto.randomUUID(),
    type: "typed-answer",
    moduleId: "verbs",
    contentId: verb.id,
    skillId: `${verb.id}:perfectum`,
    level: verb.level,
    focusLabel: "Perfectum",
    prompt: example.en,
    hint: verb.explanation.en,
    acceptedAnswers: verb.forms.perfectum.examples.map(({ nl }) => nl),
  };
}

export const verbsModule: LearningModule = {
  id: "verbs",
  displayName: "Dutch verbs",
  i18nKey: "modules.verbs.title",
  supportedLevels: [...new Set(verbCollection.items.map((verb) => verb.level))],

  async loadItems(): Promise<LearningItem[]> {
    return verbCollection.items.map((verb) => ({
      id: verb.id,
      moduleId: verb.moduleId,
      contentVersion: verbCollection.contentVersion,
      level: verb.level,
    }));
  },

  async createExercise(itemId: string): Promise<LearningExercise> {
    const verb = verbsById.get(itemId);
    if (!verb) throw new Error(`Unknown verb content item: ${itemId}`);
    return exerciseForVerb(verb);
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
