import { z } from "zod";
import { journeyRevisionSchema } from "./journey-plan.js";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const source = z
  .object({
    revision: journeyRevisionSchema,
    path: z.string().min(1).max(512),
    start: z.number().int().positive(),
    end: z.number().int().positive(),
    digest,
  })
  .strict()
  .refine(({ start, end }) => end >= start && end - start < 64);

export const journeyPublicationSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: journeyRevisionSchema,
    chapters: z
      .array(
        z
          .object({
            id: z
              .string()
              .max(64)
              .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
            title: z.string().min(1).max(100),
            blocks: z
              .array(
                z
                  .object({
                    text: z.string().trim().min(1).max(1500),
                    sources: z.array(source).min(1).max(4),
                  })
                  .strict(),
              )
              .min(1)
              .max(4),
          })
          .strict(),
      )
      .max(32),
  })
  .strict()
  .refine(
    ({ chapters }) =>
      new Set(chapters.map(({ id }) => id)).size === chapters.length,
  );

export const journeyDraftSchema = z
  .object({
    blocks: z
      .array(
        z
          .object({
            text: z.string().trim().min(1).max(1500),
            citations: z.array(z.number().int().positive()).min(1).max(4),
          })
          .strict(),
      )
      .min(1)
      .max(4),
  })
  .strict();

export type JourneyPublication = z.infer<typeof journeyPublicationSchema>;
