import { describe, it, expect } from 'vitest';
import { updateShiftsBatchSchema } from '../src/controllers/shift.controller.js';

describe('updateShiftsBatchSchema', () => {
  it('accepts a valid list of changes', () => {
    const result = updateShiftsBatchSchema.parse({
      changes: [
        { id: 1, startMin: 480, endMin: 540 },
        { id: 2, startMin: 540, endMin: 600 }
      ]
    });
    expect(result.changes).toHaveLength(2);
  });

  it('rejects an empty list (nothing to commit)', () => {
    expect(() => updateShiftsBatchSchema.parse({ changes: [] })).toThrow();
  });

  it('rejects endMin <= startMin for any entry', () => {
    expect(() => updateShiftsBatchSchema.parse({
      changes: [{ id: 1, startMin: 600, endMin: 540 }]
    })).toThrow();
  });

  it('rejects duplicate shift IDs in the same batch', () => {
    expect(() => updateShiftsBatchSchema.parse({
      changes: [
        { id: 1, startMin: 480, endMin: 540 },
        { id: 1, startMin: 600, endMin: 660 }
      ]
    })).toThrow();
  });
});
