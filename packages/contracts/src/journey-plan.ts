import { z } from "zod";

export const journeyRevisionSchema = z
  .string()
  .regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
export const journeyCatalogPath = ".github/journey-chapters.json";

const chapter = z
  .object({
    id: z
      .string()
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z
      .string()
      .max(100)
      .regex(/^[A-Za-z0-9][A-Za-z0-9 /&()-]*$/),
    paths: z
      .array(
        z
          .string()
          .max(200)
          .regex(/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/)
          .refine(
            (path) =>
              !path
                .split("/")
                .some((part) => [".", "..", ".git"].includes(part)),
          ),
      )
      .min(1)
      .max(16)
      .refine(
        (paths) => new Set(paths).size === paths.length,
        "Duplicate chapter path",
      ),
  })
  .strict();

export const journeyCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    chapters: z
      .array(chapter)
      .max(32)
      .refine(
        (chapters) =>
          new Set(chapters.map(({ id }) => id)).size === chapters.length,
        "Duplicate chapter ID",
      ),
  })
  .strict();
