import { z } from 'zod';

export const bookingCompletedSchema = z.object({
  event: z.literal('BookingCompleted'),
  bookingId: z.string().min(1),
  userId: z.string().min(1),
  scheduledEnd: z.string().datetime(),
  actualEnd: z.string().datetime(),
  includedUnits: z.number().int().nonnegative(),
  actualUnits: z.number().int().nonnegative(),
  baseFareCents: z.number().int().nonnegative(),
  preAuthId: z.string().min(1),
  preAuthAmountCents: z.number().int().positive(),
});

export type BookingCompleted = z.infer<typeof bookingCompletedSchema>;
