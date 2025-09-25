import { z } from 'zod';

// Minimal validator used by /api/people
export const PersonInsert = z.object({
  name: z.string().min(1, 'name is required'),
  role: z.string().optional().nullable(),
  email: z.string().email().optional().nullable()
});

export type PersonInsertType = z.infer<typeof PersonInsert>;
