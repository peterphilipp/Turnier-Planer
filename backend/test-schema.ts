import { z } from 'zod';
const shiftSchema = z.object({
  tournamentId: z.union([z.number(), z.string()]).transform(Number),
  date: z.string().or(z.date()),
  zeitslotId: z.union([z.number(), z.string()]).transform(Number).optional().nullable(),
  arbeitsbereichId: z.union([z.number(), z.string()]).transform(Number).optional().nullable(),
  maxVolunteers: z.number().int().min(1).optional(),
  description: z.string().optional().nullable()
});
try {
  shiftSchema.parse({
    tournamentId: 1,
    date: '2026-07-24',
    zeitslotId: 1,
    arbeitsbereichId: 1,
    maxVolunteers: 8,
    description: null,
    slot: 'Test'
  });
  console.log('OK');
} catch (e) {
  console.error(e);
}
