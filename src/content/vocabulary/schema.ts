import { z } from "zod";

const translationsSchema = z.object({ en: z.string().min(1), nl: z.string().min(1), fa: z.string().min(1) });

export const vocabularyCollectionSchema = z.object({
  contentVersion: z.number().int().positive(),
  items: z.array(z.object({
    id: z.string().min(1),
    moduleId: z.literal("vocabulary"),
    level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    lemma: z.string().min(1),
    prompt: translationsSchema,
    answer: z.string().min(1),
    acceptedVariants: z.array(z.string().min(1)).default([]),
    explanation: translationsSchema,
  })),
});

export type VocabularyContent = z.infer<typeof vocabularyCollectionSchema>["items"][number];
