import { z } from "zod";

const translationSchema = z.object({ en: z.string(), nl: z.string(), fa: z.string() });
const exampleSchema = z.object({
  nl: z.string().min(1),
  en: z.string().min(1),
  acceptedVariants: z.array(z.string().min(1)).optional(),
});

export const verbCollectionSchema = z.object({
  contentVersion: z.number().int().positive(),
  items: z.array(
    z.object({
      id: z.string().min(1),
      moduleId: z.literal("verbs"),
      level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
      lemma: z.string().min(1),
      english: z.string().min(1),
      morphology: z.discriminatedUnion("type", [
        z.object({ type: z.literal("strong") }),
        z.object({
          type: z.literal("weak"),
          stem: z.string().min(1),
          gePrefix: z.boolean(),
          separablePrefix: z.string().min(1).optional(),
          expected: z.object({
            perfectumParticiple: z.string().min(1),
            imperfectum: z.object({ singular: z.string().min(1), plural: z.string().min(1) }),
          }),
        }),
      ]),
      forms: z.object({
        perfectum: z.object({
          auxiliary: z.enum(["hebben", "zijn", "both"]),
          participle: z.string().min(1),
          examples: z.array(exampleSchema).min(1),
        }),
        imperfectum: z.object({
          singular: z.string().min(1),
          plural: z.string().min(1),
          examples: z.object({ singular: exampleSchema, plural: exampleSchema }),
        }),
      }),
      explanation: translationSchema,
    }),
  ),
});

export type VerbTense = "perfectum" | "imperfectum-singular" | "imperfectum-plural";

export type VerbCollection = z.infer<typeof verbCollectionSchema>;
export type VerbContent = VerbCollection["items"][number];
