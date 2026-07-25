import { describe, it, expect } from 'vitest';
import { formatPhoneNumber } from '../src/utils/phone';

describe('formatPhoneNumber', () => {
  it('should format standard German mobile numbers correctly', () => {
    expect(formatPhoneNumber('0171 1234567')).toBe('+49 171 1234567');
    expect(formatPhoneNumber('0171/1234567')).toBe('+49 171 1234567');
    expect(formatPhoneNumber('0171-1234567')).toBe('+49 171 1234567');
    expect(formatPhoneNumber('+49 171 1234567')).toBe('+49 171 1234567');
    expect(formatPhoneNumber('0049 171 1234567')).toBe('+49 171 1234567');
  });

  it('should format 4-digit mobile prefix German numbers (015xx) correctly', () => {
    expect(formatPhoneNumber('01520 9876543')).toBe('+49 1520 9876543');
    expect(formatPhoneNumber('+4915771234567')).toBe('+49 1577 1234567');
  });

  it('should format German landline numbers correctly', () => {
    expect(formatPhoneNumber('04103 123456')).toBe('+49 4103 123456');
    expect(formatPhoneNumber('040 87654321')).toBe('+49 40 87654321');
    expect(formatPhoneNumber('030 1234567')).toBe('+49 30 1234567');
  });

  it('should handle international numbers', () => {
    expect(formatPhoneNumber('+43 664 1234567')).toBe('+43 664 1234567');
    expect(formatPhoneNumber('+41 79 1234567')).toBe('+41 79 1234567');
  });

  it('should return null or preserve invalid inputs gracefully', () => {
    expect(formatPhoneNumber('')).toBeNull();
    expect(formatPhoneNumber(null)).toBeNull();
    expect(formatPhoneNumber('123')).toBe('123');
  });
});
