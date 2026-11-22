export function normalizeAnswer(answer: string): string {
  return answer
    .trim()
    .toLocaleLowerCase("nl-NL")
    .replace(/[.!?;:,]+$/u, "")
    .replace(/\s+/gu, " ");
}
