import type { FillGapSegment } from "@/learning/contracts/module";

function isWordCharacter(character: string | undefined): boolean {
  return character !== undefined && /[\p{L}\p{N}_]/u.test(character);
}

export function createFillGapSegments(
  sentence: string,
  target: string,
  blankId: string,
): FillGapSegment[] | undefined {
  const start = sentence.toLocaleLowerCase("nl-NL").indexOf(target.toLocaleLowerCase("nl-NL"));
  if (start < 0) return undefined;
  const end = start + target.length;
  if (isWordCharacter(sentence[start - 1]) || isWordCharacter(sentence[end])) return undefined;

  const segments: FillGapSegment[] = [];
  if (start > 0) segments.push({ id: `${blankId}-before`, type: "text", text: sentence.slice(0, start) });
  segments.push({ type: "blank", blankId });
  if (end < sentence.length) segments.push({ id: `${blankId}-after`, type: "text", text: sentence.slice(end) });
  return segments;
}
