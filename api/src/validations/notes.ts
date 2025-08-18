import { z } from "zod";

export const attemptSchema = z.object({
  at: z.date(),
  statusCode: z.number(),
  ok: z.boolean(),
  error: z.string().optional(),
});

export const createNoteSchema = z.object({
  title: z.string().min(1, "Title is Required"),
  body: z.string().min(1, "Body is required"),
  releaseAt: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date()
  ),
  webhookUrl: z.string().url("Invalid Url"),
  status: z.enum(["pending", "delivered", "failed", "dead"]).default("pending"),
  attempts: z.array(attemptSchema).optional().default([]),
  deliveredAt: z
    .preprocess((val) => {
      if (val == null) return null; //catches null and undefined
      if (typeof val === "string" || val instanceof Date) {
        return new Date(val);
      }
      return val;
    }, z.date().nullable())
    .default(null),
});

export const fetchPaginatedNotesSchema = z.object({
  status: z.enum(["pending", "delivered", "failed", "dead"]).default("pending"),
  page: z.number().min(1, "Invalid Page Number"),
});

export const replayNoteSchema = z.object({
  id: z.string().min(1, "Note ID is required"),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type FetchPaginatedNotesInput = z.infer<
  typeof fetchPaginatedNotesSchema
>;
export type ReplayNoteInput = z.infer<typeof replayNoteSchema>;
