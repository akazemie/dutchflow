// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FillGapExercise, MultipleChoiceExercise, TypedAnswerExercise } from "@/learning/contracts/module";
import { FillGapRenderer } from "./fill-gap-renderer";
import { MultipleChoiceRenderer } from "./multiple-choice-renderer";
import { TypedAnswerRenderer } from "./typed-answer-renderer";

const typedExercise: TypedAnswerExercise = {
  id: "typed-1",
  type: "typed-answer",
  moduleId: "vocabulary",
  contentId: "vocabulary:appel",
  skillId: "vocabulary:appel:meaning",
  level: "A1",
  focusId: "meaning",
  focusLabel: "Vocabulary",
  title: "Translate",
  answerLabel: "Your Dutch answer",
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
  focusLabel: "Vocabulary",
  title: "Choose the answer",
  answerLabel: "Choose one Dutch translation",
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
  focusLabel: "Vocabulary",
  title: "Complete the sentence",
  answerLabel: "Fill in the missing word",
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

describe("exercise renderers", () => {
  afterEach(cleanup);

  it("submits a typed answer and uses the exercise-provided label", () => {
    const onAnswer = vi.fn();
    render(
      <TypedAnswerRenderer exercise={typedExercise} disabled={false} feedback={null} onAnswer={onAnswer} />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Your Dutch answer" }), {
      target: { value: "Ze eet een appel." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onAnswer).toHaveBeenCalledWith({ type: "typed-answer", value: "Ze eet een appel." });
  });

  it("provides keyboard-accessible multiple-choice radios and submits the chosen option", () => {
    const onAnswer = vi.fn();
    render(
      <MultipleChoiceRenderer exercise={multipleChoiceExercise} disabled={false} feedback={null} onAnswer={onAnswer} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Ze eet een peer." }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onAnswer).toHaveBeenCalledWith({ type: "multiple-choice", optionId: "wrong" });
  });

  it("submits fill-gap values and displays per-blank expected feedback", () => {
    const onAnswer = vi.fn();
    render(
      <FillGapRenderer
        exercise={fillGapExercise}
        disabled={false}
        feedback={{
          correct: false,
          feedback: "Not quite.",
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

    fireEvent.change(screen.getByRole("textbox", { name: "Fill in the missing word 1" }), {
      target: { value: "peer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onAnswer).toHaveBeenCalledWith({ type: "fill-gap", values: { gap: "peer" } });
    expect(screen.getByText("Expected: appel")).toBeTruthy();
  });
});
