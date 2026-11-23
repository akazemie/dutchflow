export function createExerciseId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `exercise-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
