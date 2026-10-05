import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const clubIdParamsSchema = z.object({
  clubId: objectIdSchema,
});

export const questionParamsSchema = z.object({
  clubId: objectIdSchema,
  questionId: objectIdSchema,
});

export const bulkDeleteSchema = z.object({
  ids: z
    .array(objectIdSchema)
    .min(1, "At least one question id is required")
    .max(100, "At most 100 question ids can be deleted at once"),
});

export { objectIdSchema };
