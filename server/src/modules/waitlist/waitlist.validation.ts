import { z } from "zod";

export const joinWaitlistSchema = z.object({
  swimmerFirstName: z.string().min(1, "Swimmer first name is required"),
  swimmerLastName: z.string().min(1, "Swimmer last name is required"),
  swimmerDob: z.string().optional(),
  ageOnTryoutDay: z.coerce.number().int().min(1).max(100),
  segmentId: z.string().optional().default(""),
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianEmail: z.string().email("Valid guardian email is required"),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
