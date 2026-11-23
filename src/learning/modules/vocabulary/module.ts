import rawContent from "@/content/vocabulary/vocabulary.json";
import { vocabularyCollectionSchema } from "@/content/vocabulary/schema";
import type { Answer, LearningExercise, LearningItem, LearningModule } from "@/learning/contracts/module";
import { evaluateTypedAnswer } from "@/learning/exercises/evaluate-typed-answer";
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
      title: "Translate into Dutch",
      answerLabel: "Your answer in Dutch",
      prompt: item.prompt.en,
      hint: item.explanation[explanationLanguage],
      acceptedAnswers: [item.answer, ...item.acceptedVariants],
    };
  },

  async evaluate(exercise: LearningExercise, answer: Answer) {
    if (exercise.type !== "typed-answer" || answer.type !== "typed-answer") {
      throw new Error("Unsupported exercise or answer type for the vocabulary module.");
    }
    return evaluateTypedAnswer(exercise, answer);
  },
};
