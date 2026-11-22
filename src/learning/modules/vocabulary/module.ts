import rawContent from "@/content/vocabulary/vocabulary.json";
import { vocabularyCollectionSchema } from "@/content/vocabulary/schema";
import type { EvaluationResult, LearningExercise, LearningItem, LearningModule } from "@/learning/contracts/module";
import { normalizeAnswer } from "@/learning/core/normalize-answer";
import { isLevelAvailableAt } from "@/learning/core/preferences";

const collection = vocabularyCollectionSchema.parse(rawContent);
const itemById = new Map(collection.items.map((item) => [item.id, item]));

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

  async createExercise(itemId, context): Promise<LearningExercise> {
    const item = itemById.get(itemId);
    if (!item) throw new Error(`Unknown vocabulary content item: ${itemId}`);
    const explanationLanguage = context?.explanationLanguage ?? "en";
    return {
      id: crypto.randomUUID(),
      type: "typed-answer",
      moduleId: "vocabulary",
      contentId: item.id,
      skillId: `${item.id}:meaning`,
      level: item.level,
      focusId: "meaning",
      focusLabel: "Vocabulary",
      prompt: item.prompt.en,
      hint: item.explanation[explanationLanguage],
      acceptedAnswers: [item.answer, ...item.acceptedVariants],
    };
  },

  async evaluate(exercise, answer): Promise<EvaluationResult> {
    const normalizedAnswer = normalizeAnswer(answer);
    const correct = normalizedAnswer.length > 0 && exercise.acceptedAnswers.map(normalizeAnswer).includes(normalizedAnswer);
    return {
      correct,
      feedback: correct ? `Correct. ${exercise.acceptedAnswers[0]} is right.` : `Not quite. One accepted answer is: ${exercise.acceptedAnswers[0]}`,
      rating: correct ? "good" : "again",
      skillIds: [exercise.skillId],
    };
  },
};
