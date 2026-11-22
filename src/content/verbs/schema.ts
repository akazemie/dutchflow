import { z } from "zod";

const translationSchema = z.object({ en: z.string(), nl: z.string(), fa: z.string() });

export const verbCollectionSchema = z.object({
  contentVersion: z.number().int().positive(),
  items: z.array(
    z.object({
      id: z.string().min(1),
      moduleId: z.literal("verbs"),
      level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
      lemma: z.string().min(1),
      english: z.string().min(1),
      forms: z.object({
        perfectum: z.object({
          auxiliary: z.enum(["hebben", "zijn", "both"]),
          participle: z.string().min(1),
          examples: z.array(z.object({ nl: z.string().min(1), en: z.string().min(1) })).min(1),
        }),
        imperfectum: z.object({ singular: z.string().min(1), plural: z.string().min(1) }),
      }),
      explanation: translationSchema,
    }),
  ),
});

export type VerbCollection = z.infer<typeof verbCollectionSchema>;
export type VerbContent = VerbCollection["items"][number];
