import { describe, expect, it } from "vitest";
import rawVerbContent from "@/content/verbs/verbs.json";
import { verbCollectionSchema } from "@/content/verbs/schema";
import { normalizeAnswer } from "@/learning/core/normalize-answer";
import { verbsModule } from "./module";
import { getVerbDistractors, getVerbPrompt } from "./exercise-generation";

const collection = verbCollectionSchema.parse(rawVerbContent);
const focuses = verbsModule.exerciseFocuses;

describe("verb multiple-choice distractors", () => {
  it("adds a weak-ified form as a distractor for strong verbs", () => {
    const verb = collection.items.find((item) => item.id === "verb:lopen");
    if (!verb) throw new Error("Expected lopen content.");
    const prompt = getVerbPrompt(verb, "imperfectum-singular", focuses);

    expect(getVerbDistractors(verb, "imperfectum-singular", prompt).map((option) => option.text))
      .toContain("Ik loopte.");
  });

  it("excludes every accepted answer variant, including variants containing the t/d form", async () => {
    const verb = collection.items.find((item) => item.id === "verb:fietsen");
    if (!verb) throw new Error("Expected fietsen content.");
    const prompt = getVerbPrompt(verb, "imperfectum-plural", focuses);
    const acceptedAnswers = [prompt.example.nl, ...(prompt.example.acceptedVariants ?? [])];
    const normalizedAccepted = new Set(acceptedAnswers.map(normalizeAnswer));

    expect(acceptedAnswers).toContain("We fietsten naar het werk.");
    const distractors = getVerbDistractors(verb, "imperfectum-plural", prompt);

    expect(distractors).toHaveLength(3);
    expect(distractors.every((option) => !normalizedAccepted.has(normalizeAnswer(option.text)))).toBe(true);
    expect(new Set(distractors.map((option) => normalizeAnswer(option.text))).size).toBe(3);

    const exercise = await verbsModule.createExercise("verb:fietsen", {
      focusId: "imperfectum-plural",
      exerciseType: "multiple-choice",
      seed: "distractor-test",
    });
    expect(exercise.type).toBe("multiple-choice");
    if (exercise.type !== "multiple-choice") throw new Error("Expected multiple-choice exercise.");
    expect(exercise.options).toHaveLength(4);
    expect(exercise.options.filter((option) => option.id === exercise.correctOptionId)).toHaveLength(1);
  });
});
