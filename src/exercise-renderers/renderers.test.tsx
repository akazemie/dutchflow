// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  FillGapExercise,
  MatchingExercise,
  MultipleChoiceExercise,
  TypedAnswerExercise,
  WordOrderingExercise,
} from "@/learning/contracts/module";
import { message } from "@/learning/contracts/message";
import { formatMessage, type MessageTranslator } from "@/i18n/catalog";
import { ExerciseRendererView } from "./exercise-renderer-view";
import { FillGapRenderer } from "./fill-gap-renderer";
import { MatchingRenderer } from "./matching-renderer";
import { MultipleChoiceRenderer } from "./multiple-choice-renderer";
import { TypedAnswerRenderer } from "./typed-answer-renderer";
import { WordOrderingRenderer } from "./word-ordering-renderer";

const typedExercise: TypedAnswerExercise = {
  id: "typed-1",
  type: "typed-answer",
  moduleId: "vocabulary",
  contentId: "vocabulary:appel",
  skillId: "vocabulary:appel:meaning",
  level: "A1",
  focusId: "meaning",
  focusLabel: message("focus.vocabulary"),
  title: message("exercise.title.translate"),
  answerLabel: message("exercise.answer.yourDutch"),
  typoTolerance: "one-edit",
  partialCredit: "graded",
  prompt: "She eats an apple.",
  acceptedAnswers: ["Ze eet een appel."],
};

const multipleChoiceExercise: MultipleChoiceExercise = {
  id: "mc-1",
  type: "multiple-choice",
  moduleId: "vocabulary",
  contentId: "vocabulary:appel",
  skillId: "vocabulary:appel:meaning",
  level: "A1",
  focusId: "meaning",
  focusLabel: message("focus.vocabulary"),
  title: message("exercise.title.chooseTranslation"),
  answerLabel: message("exercise.answer.chooseDutchWord"),
  typoTolerance: "none",
  partialCredit: "none",
  prompt: "She eats an apple.",
  options: [
    { id: "right", text: "Ze eet een appel." },
    { id: "wrong", text: "Ze eet een peer." },
  ],
  correctOptionId: "right",
};

const fillGapExercise: FillGapExercise = {
  id: "gap-1",
  type: "fill-gap",
  moduleId: "vocabulary",
  contentId: "vocabulary:appel",
  skillId: "vocabulary:appel:meaning",
  level: "A1",
  focusId: "meaning",
  focusLabel: message("focus.vocabulary"),
  title: message("exercise.title.completeSentence"),
  answerLabel: message("exercise.answer.fillDutchWord"),
  typoTolerance: "one-edit",
  partialCredit: "graded",
  prompt: "She eats an apple.",
  segments: [
    { id: "before", type: "text", text: "Ze eet een " },
    { type: "blank", blankId: "gap" },
    { id: "after", type: "text", text: "." },
  ],
  blanks: [{ id: "gap", acceptedAnswers: ["appel"] }],
};

const wordOrderingExercise: WordOrderingExercise = {
  id: "order-1",
  type: "word-ordering",
  moduleId: "vocabulary",
  contentId: "vocabulary:appel",
  skillId: "vocabulary:appel:meaning",
  level: "A1",
  focusId: "meaning",
  focusLabel: message("focus.vocabulary"),
  title: message("exercise.title.buildSentence"),
  answerLabel: message("exercise.answer.orderSentence"),
  typoTolerance: "none",
  partialCredit: "none",
  prompt: "She eats an apple.",
  tokens: [
    { id: "today", text: "vandaag" },
    { id: "eet", text: "eet" },
    { id: "ik", text: "ik" },
    { id: "een", text: "een" },
  ],
  acceptedOrders: [["Vandaag", "eet", "ik", "een"]],
};

const matchingExercise: MatchingExercise = {
  id: "matching-1",
  type: "matching",
  moduleId: "verbs",
  contentId: "verb:lopen",
  skillId: "verb:lopen:perfectum",
  level: "A1",
  focusId: "matching",
  focusLabel: message("focus.verbForms"),
  title: message("exercise.title.matchFacets"),
  answerLabel: message("exercise.answer.matchForms"),
  typoTolerance: "none",
  partialCredit: "none",
  pairs: [
    { id: "perfectum", left: message("focus.perfectum"), right: "hebben + gelopen", skillId: "verb:lopen:perfectum" },
    { id: "singular", left: message("focus.imperfectum.singular"), right: "liep", skillId: "verb:lopen:imperfectum:singular" },
    { id: "plural", left: message("focus.imperfectum.plural"), right: "liepen", skillId: "verb:lopen:imperfectum:plural" },
  ],
  rightOrder: ["singular", "perfectum", "plural"],
};

const t: MessageTranslator = (value, params) =>
  typeof value === "string"
    ? formatMessage("en", value, params)
    : formatMessage("en", value.key, value.params);

describe("exercise renderers", () => {
  afterEach(cleanup);

  it("submits a typed answer and uses the exercise-provided label", () => {
    const onAnswer = vi.fn();
    render(
      <TypedAnswerRenderer exercise={typedExercise} disabled={false} feedback={null} t={t} onAnswer={onAnswer} />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Your answer in Dutch" }), {
      target: { value: "Ze eet een appel." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onAnswer).toHaveBeenCalledWith({ type: "typed-answer", value: "Ze eet een appel." });
  });

  it("provides keyboard-accessible multiple-choice radios and submits the chosen option", () => {
    const onAnswer = vi.fn();
    render(
      <MultipleChoiceRenderer exercise={multipleChoiceExercise} disabled={false} feedback={null} t={t} onAnswer={onAnswer} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Ze eet een peer." }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onAnswer).toHaveBeenCalledWith({ type: "multiple-choice", optionId: "wrong" });
  });

  it("clears multiple-choice selection when rerendered with a new exercise", () => {
    const first = { ...multipleChoiceExercise, id: "mc-first" };
    const next = { ...multipleChoiceExercise, id: "mc-next" };
    const props = { disabled: false, feedback: null, onAnswer: vi.fn(), t };
    const { rerender } = render(<ExerciseRendererView exercise={first} {...props} />);

    fireEvent.click(screen.getByRole("radio", { name: "Ze eet een peer." }));
    expect(screen.getByRole("radio", { name: "Ze eet een peer." })).toHaveProperty("checked", true);

    rerender(<ExerciseRendererView exercise={next} {...props} />);

    expect(screen.getByRole("radio", { name: "Ze eet een peer." })).toHaveProperty("checked", false);
  });

  it("submits fill-gap values and displays per-blank expected feedback", () => {
    const onAnswer = vi.fn();
    render(
      <FillGapRenderer
        exercise={fillGapExercise}
        disabled={false}
        t={t}
        feedback={{
          correct: false,
          feedback: message("evaluation.expected", { expected: "appel" }),
          score: 0,
          expected: ["appel"],
          rating: "again",
          skillIds: [fillGapExercise.skillId],
          skillResults: [{ skillId: fillGapExercise.skillId, correct: false, rating: "again" }],
          itemResults: [{ itemId: "gap", correct: false, expected: ["appel"] }],
        }}
        onAnswer={onAnswer}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Fill in the missing Dutch word 1" }), {
      target: { value: "peer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onAnswer).toHaveBeenCalledWith({ type: "fill-gap", values: { gap: "peer" } });
    expect(screen.getByText("Expected: appel")).toBeTruthy();
    expect(screen.queryByText("Not quite.")).toBeNull();
  });

  it("uses focusable native buttons to build and submit a word order", () => {
    const onAnswer = vi.fn();
    render(
      <WordOrderingRenderer exercise={wordOrderingExercise} disabled={false} feedback={null} t={t} onAnswer={onAnswer} />,
    );

    const todayButton = screen.getByRole("button", { name: "vandaag" });
    expect(todayButton.tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: "Check answer" })).toHaveProperty("disabled", true);
    todayButton.focus();
    expect(document.activeElement).toBe(todayButton);
    fireEvent.click(todayButton);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "eet" }));
    fireEvent.click(screen.getByRole("button", { name: "eet" }));
    fireEvent.click(screen.getByRole("button", { name: "ik" }));
    fireEvent.click(screen.getByRole("button", { name: "een" }));
    expect(document.activeElement).toBe(screen.getByRole("list", { name: "Sentence order" }));
    expect(screen.getByRole("button", { name: "Check answer" })).toHaveProperty("disabled", false);
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onAnswer).toHaveBeenCalledWith({
      type: "word-ordering",
      tokenIds: ["today", "eet", "ik", "een"],
    });
  });

  it("resets wrong matches so all three facets can be corrected", () => {
    const onAnswer = vi.fn();
    const { rerender } = render(
      <MatchingRenderer exercise={matchingExercise} disabled={false} feedback={null} t={t} onAnswer={onAnswer} />,
    );
    const perfectumButton = screen.getByRole("button", { name: /^Perfectum/ });

    expect(perfectumButton.tagName).toBe("BUTTON");
    perfectumButton.focus();
    expect(document.activeElement).toBe(perfectumButton);
    fireEvent.click(perfectumButton);
    fireEvent.click(screen.getByRole("button", { name: "liep" }));
    fireEvent.click(screen.getByRole("button", { name: /^Imperfectum · singular/ }));
    fireEvent.click(screen.getByRole("button", { name: "liepen" }));
    fireEvent.click(screen.getByRole("button", { name: /^Imperfectum · plural/ }));
    fireEvent.click(screen.getByRole("button", { name: "hebben + gelopen" }));

    expect(screen.getByRole("button", { name: /^Perfectum/ }).textContent).toContain("liep");
    expect(screen.getByRole("button", { name: /^Imperfectum · singular/ }).textContent).toContain("liepen");
    expect(screen.getByRole("button", { name: /^Imperfectum · plural/ }).textContent).toContain("hebben + gelopen");

    fireEvent.click(screen.getByRole("button", { name: "Reset matches" }));
    expect(onAnswer).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^Perfectum/ }).textContent).toBe("Perfectum");
    fireEvent.click(screen.getByRole("button", { name: "Perfectum" }));
    fireEvent.click(screen.getByRole("button", { name: "hebben + gelopen" }));
    fireEvent.click(screen.getByRole("button", { name: "Imperfectum · singular" }));
    fireEvent.click(screen.getByRole("button", { name: "liep" }));
    fireEvent.click(screen.getByRole("button", { name: "Imperfectum · plural" }));
    fireEvent.click(screen.getByRole("button", { name: "liepen" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onAnswer).toHaveBeenLastCalledWith({
      type: "matching",
      matches: { perfectum: "perfectum", singular: "singular", plural: "plural" },
    });

    rerender(
      <MatchingRenderer
        exercise={matchingExercise}
        disabled
        t={t}
        feedback={{
          correct: true,
          feedback: message("evaluation.allPairs"),
          score: 1,
          expected: ["hebben + gelopen", "liep", "liepen"],
          rating: "hard",
          skillIds: matchingExercise.pairs.map((pair) => pair.skillId),
          skillResults: matchingExercise.pairs.map((pair) => ({
            skillId: pair.skillId,
            correct: true,
            rating: "hard",
          })),
          itemResults: matchingExercise.pairs.map((pair) => ({
            itemId: pair.id,
            correct: true,
            expected: [pair.right],
          })),
        }}
        onAnswer={onAnswer}
      />,
    );
    const firstResult = screen.getAllByRole("listitem")[0].textContent ?? "";
    expect(firstResult).toContain("Perfectum");
    expect(firstResult).toContain("Correct");
    expect(firstResult).toContain("Expected");
    expect(firstResult).toContain("hebben + gelopen");
  });
});
