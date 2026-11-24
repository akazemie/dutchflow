import type { WordOrderingExercise } from "@/learning/contracts/module";
import { normalizeAnswer } from "@/learning/core/normalize-answer";
import { seededShuffle } from "@/learning/core/seeded-shuffle";

type WordOrderingFields = Pick<WordOrderingExercise, "tokens" | "acceptedOrders">;

function splitSentence(sentence: string): string[] {
  const tokens = sentence.trim().split(/\s+/u);
  if (tokens.length === 0 || tokens[0] === "") return [];
  const last = tokens.length - 1;
  tokens[last] = tokens[last]!.replace(/[\p{P}\p{S}]+$/u, "");
  return tokens;
}

function normalizeSequence(tokens: readonly string[]): string[] {
  return tokens.map(normalizeAnswer);
}

function sequenceKey(tokens: readonly string[]): string {
  return normalizeSequence(tokens).join("\u001f");
}

function hasSameTokens(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const counts = new Map<string, number>();
  for (const token of normalizeSequence(left)) counts.set(token, (counts.get(token) ?? 0) + 1);
  for (const token of normalizeSequence(right)) {
    const count = counts.get(token) ?? 0;
    if (count === 0) return false;
    if (count === 1) counts.delete(token);
    else counts.set(token, count - 1);
  }
  return counts.size === 0;
}

export function supportsWordOrdering(sentence: string): boolean {
  return splitSentence(sentence).length >= 4;
}

export function createWordOrderingFields(
  sentence: string,
  acceptedVariants: readonly string[],
  exerciseId: string,
  seed: string | undefined,
): WordOrderingFields | undefined {
  const sentenceTokens = splitSentence(sentence);
  if (sentenceTokens.length < 4 || sentenceTokens.some((token) => !normalizeAnswer(token))) return undefined;

  const acceptedOrders = [sentenceTokens];
  const seenOrders = new Set([sequenceKey(sentenceTokens)]);
  for (const variant of acceptedVariants) {
    const tokens = splitSentence(variant);
    if (!hasSameTokens(sentenceTokens, tokens)) continue;
    const key = sequenceKey(tokens);
    if (seenOrders.has(key)) continue;
    seenOrders.add(key);
    acceptedOrders.push(tokens);
  }

  const tokens = sentenceTokens.map((text, index) => ({
    id: `${exerciseId}-token-${index}`,
    text: index === 0 ? text.toLocaleLowerCase("nl-NL") : text,
  }));
  const acceptedOrderKeys = new Set(acceptedOrders.map(sequenceKey));
  const shuffleSeed = seed ?? exerciseId;
  let shuffledTokens = seededShuffle(tokens, shuffleSeed);
  if (acceptedOrderKeys.has(sequenceKey(shuffledTokens.map((token) => token.text)))) {
    shuffledTokens = seededShuffle(tokens, `${shuffleSeed}:reshuffle`);
  }
  if (acceptedOrderKeys.has(sequenceKey(shuffledTokens.map((token) => token.text)))) return undefined;

  return {
    tokens: shuffledTokens,
    acceptedOrders,
  };
}
