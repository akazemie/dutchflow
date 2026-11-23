import type {
  ExerciseFocus,
  FillGapExercise,
  LearningSkill,
  MultipleChoiceExercise,
  TypedAnswerExercise,
} from "@/learning/contracts/module";
import type { ExplanationLanguage } from "@/learning/core/preferences";
import type { VerbContent } from "@/content/verbs/schema";
import { createExerciseId } from "@/learning/core/create-exercise-id";
import { createFillGapSegments } from "@/learning/exercises/create-fill-gap-segments";
import { createMultipleChoiceOptions, selectDistinctDistractors } from "@/learning/exercises/create-multiple-choice-options";
import type { AnswerOption } from "@/learning/exercises/create-multiple-choice-options";
import { generateWeakForms } from "./conjugation/weak-forms";

export interface VerbPrompt {
  example: { en: string; nl: string; acceptedVariants?: string[] };
  focusLabel: string;
  skillId: string;
  targetForm: string;
}

export function getVerbPrompt(verb: VerbContent, focusId: string, focuses: ExerciseFocus[]): VerbPrompt {
  const focus = focuses.find((item) => item.id === focusId);
  if (!focus) throw new Error(`Unknown verb exercise focus: ${focusId}`);

  if (focusId === "perfectum") {
    const example = verb.forms.perfectum.examples[0];
    if (!example) throw new Error(`Verb ${verb.id} has no Perfectum example.`);
    return {
      example,
      focusLabel: focus.label,
      skillId: `${verb.id}:perfectum`,
      targetForm: verb.forms.perfectum.participle,
    };
  }

  const person = focusId === "imperfectum-singular" ? "singular" : "plural";
  return {
    example: verb.forms.imperfectum.examples[person],
    focusLabel: focus.label,
    skillId: `${verb.id}:imperfectum:${person}`,
    targetForm: verb.forms.imperfectum[person],
  };
}

export function verbSkills(verb: VerbContent, focuses: ExerciseFocus[]): LearningSkill[] {
  return focuses.map((focus) => ({ skillId: getVerbPrompt(verb, focus.id, focuses).skillId, focusId: focus.id }));
}

function getWeakifiedForms(verb: VerbContent) {
  if (verb.morphology.type !== "strong") return undefined;
  let stem = verb.lemma.replace(/en$/iu, "").replace(/([bcdfghjklmnpqrstvwxz])\1$/iu, "$1");
  stem = stem.replace(/(^|[^aeiou])([aeou])([ptkfschx])$/iu, "$1$2$2$3");
  stem = stem.replace(/v$/iu, "f").replace(/z$/iu, "s");
  return generateWeakForms({ type: "weak", stem, gePrefix: true });
}

function replaceWholeForm(sentence: string, form: string, replacement: string): string | undefined {
  const start = sentence.toLocaleLowerCase("nl-NL").indexOf(form.toLocaleLowerCase("nl-NL"));
  if (start < 0) return undefined;
  const end = start + form.length;
  if ((/[^\p{L}\p{N}_]/u.test(sentence[start - 1] ?? "") === false && start > 0)
    || (/[^\p{L}\p{N}_]/u.test(sentence[end] ?? "") === false && end < sentence.length)) return undefined;
  return `${sentence.slice(0, start)}${replacement}${sentence.slice(end)}`;
}

function swapDentalEnding(form: string): string | undefined {
  return form.replace(/([td])(en|e)?$/iu, (match, ending: string, suffix = "") =>
    `${ending.toLocaleLowerCase("nl-NL") === "t" ? "d" : "t"}${suffix}`,
  ) === form
    ? undefined
    : form.replace(/([td])(en|e)?$/iu, (_match, ending: string, suffix = "") =>
      `${ending.toLocaleLowerCase("nl-NL") === "t" ? "d" : "t"}${suffix}`,
    );
}

function wrongAuxiliary(sentence: string, auxiliary: "hebben" | "zijn" | "both"): string | undefined {
  if (auxiliary === "both") return undefined;
  const replacements: Record<string, string> = auxiliary === "hebben"
    ? { heb: "ben", heeft: "is", hebben: "zijn" }
    : { ben: "heb", is: "heeft", zijn: "hebben" };
  return sentence.replace(/\b(heb|heeft|hebben|ben|is|zijn)\b/iu, (matched) => replacements[matched.toLocaleLowerCase("nl-NL")] ?? matched);
}

export function getVerbDistractors(verb: VerbContent, focusId: string, prompt: VerbPrompt): AnswerOption[] {
  const candidates: string[] = [];
  const acceptedAnswers = [prompt.example.nl, ...(prompt.example.acceptedVariants ?? [])];
  const addTargetReplacement = (replacement: string | undefined) => {
    if (!replacement) return;
    for (const answer of acceptedAnswers) {
      const candidate = replaceWholeForm(answer, prompt.targetForm, replacement);
      if (candidate) candidates.push(candidate);
    }
  };

  const weakifiedForms = getWeakifiedForms(verb);
  if (focusId === "perfectum") addTargetReplacement(weakifiedForms?.perfectumParticiple);
  if (focusId === "imperfectum-singular") addTargetReplacement(weakifiedForms?.imperfectum.singular);
  if (focusId === "imperfectum-plural") addTargetReplacement(weakifiedForms?.imperfectum.plural);

  const swappedEnding = swapDentalEnding(prompt.targetForm);
  if (verb.morphology.type === "weak") addTargetReplacement(swappedEnding);
  if (focusId === "perfectum" && prompt.targetForm.startsWith("ge")) {
    addTargetReplacement(prompt.targetForm.slice(2));
  }
  if (focusId === "imperfectum-singular") {
    addTargetReplacement(verb.forms.imperfectum.plural);
    addTargetReplacement(swapDentalEnding(verb.forms.imperfectum.plural));
  }
  if (focusId === "imperfectum-plural") {
    addTargetReplacement(verb.forms.imperfectum.singular);
    addTargetReplacement(swapDentalEnding(verb.forms.imperfectum.singular));
  }
  if (focusId === "perfectum") {
    const auxiliary = wrongAuxiliary(prompt.example.nl, verb.forms.perfectum.auxiliary);
    if (auxiliary) candidates.push(auxiliary);
  }

  return selectDistinctDistractors(
    candidates.map((text, index) => ({ id: `distractor-${index}`, text })),
    acceptedAnswers,
    3,
  );
}

function commonFields(
  verb: VerbContent,
  focusId: string,
  prompt: VerbPrompt,
  id: string,
  explanationLanguage: ExplanationLanguage,
) {
  return {
    id,
    moduleId: "verbs",
    contentId: verb.id,
    skillId: prompt.skillId,
    level: verb.level,
    focusId,
    focusLabel: prompt.focusLabel,
    title: "Translate into Dutch",
    answerLabel: "Select or enter the correct Dutch form",
    typoTolerance: "none" as const,
    partialCredit: "none" as const,
    hint: verb.explanation[explanationLanguage],
  };
}

export function createVerbTypedAnswer(
  verb: VerbContent,
  focusId: string,
  prompt: VerbPrompt,
  explanationLanguage: ExplanationLanguage,
): TypedAnswerExercise {
  return {
    ...commonFields(verb, focusId, prompt, createExerciseId(), explanationLanguage),
    type: "typed-answer",
    prompt: prompt.example.en,
    acceptedAnswers: [prompt.example.nl, ...(prompt.example.acceptedVariants ?? [])],
  };
}

export function createVerbMultipleChoice(
  verb: VerbContent,
  focusId: string,
  prompt: VerbPrompt,
  seed: string | undefined,
  explanationLanguage: ExplanationLanguage,
): MultipleChoiceExercise | undefined {
  const distractors = getVerbDistractors(verb, focusId, prompt);
  if (distractors.length < 3) return undefined;
  const id = createExerciseId();
  const shuffleSeed = seed ?? id;
  const correctOption = { id: `correct-${id}`, text: prompt.example.nl };
  return {
    ...commonFields(verb, focusId, prompt, id, explanationLanguage),
    type: "multiple-choice",
    prompt: prompt.example.en,
    ...createMultipleChoiceOptions(correctOption, distractors, shuffleSeed),
  };
}

export function createVerbFillGap(
  verb: VerbContent,
  focusId: string,
  prompt: VerbPrompt,
  explanationLanguage: ExplanationLanguage,
): FillGapExercise | undefined {
  const id = createExerciseId();
  const blankId = `${id}-gap`;
  const segments = createFillGapSegments(prompt.example.nl, prompt.targetForm, blankId);
  if (!segments) return undefined;
  return {
    ...commonFields(verb, focusId, prompt, id, explanationLanguage),
    type: "fill-gap",
    prompt: prompt.example.en,
    answerLabel: "Fill in the missing Dutch verb form",
    typoTolerance: "none",
    partialCredit: "none",
    segments,
    blanks: [{ id: blankId, acceptedAnswers: [prompt.targetForm] }],
  };
}
