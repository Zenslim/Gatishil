import { z } from 'zod';

export const PersonInsert = z.object({
  name: z.string().min(1, 'Name is required'),
  thar: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable()
});
export type PersonInsertType = z.infer<typeof PersonInsert>;
