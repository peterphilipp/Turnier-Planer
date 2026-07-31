import { describe, it, expect } from 'vitest';
import { sanitizeChildrenInput } from '../src/utils/sanitizeChildren';

describe('sanitizeChildrenInput', () => {
  it('should return empty array for null/undefined/non-array', () => {
    expect(sanitizeChildrenInput(null)).toEqual([]);
    expect(sanitizeChildrenInput(undefined)).toEqual([]);
    expect(sanitizeChildrenInput([] as any)).toEqual([]);
  });

  it('should filter out entries with missing or empty childName', () => {
    const input = [
      { childName: '', childYear: 2018 },
      { childName: '   ', childYear: 2018 },
      { childName: null, childYear: 2018 },
      { childName: 'Tom', childYear: 2018 }
    ];
    expect(sanitizeChildrenInput(input)).toEqual([
      { childName: 'Tom', childYear: 2018 }
    ]);
  });

  it('should filter out entries with invalid/NaN/empty childYear', () => {
    const input = [
      { childName: 'Child 1', childYear: '' },
      { childName: 'Child 2', childYear: null },
      { childName: 'Child 3', childYear: undefined },
      { childName: 'Child 4', childYear: NaN },
      { childName: 'Child 5', childYear: 'invalid' },
      { childName: 'Child 6', childYear: 1850 }, // out of range
      { childName: 'Child 7', childYear: 2018 }  // valid
    ];
    expect(sanitizeChildrenInput(input as any)).toEqual([
      { childName: 'Child 7', childYear: 2018 }
    ]);
  });

  it('should parse string years correctly', () => {
    const input = [
      { childName: '  Anna  ', childYear: '2015' }
    ];
    expect(sanitizeChildrenInput(input)).toEqual([
      { childName: 'Anna', childYear: 2015 }
    ]);
  });
});
