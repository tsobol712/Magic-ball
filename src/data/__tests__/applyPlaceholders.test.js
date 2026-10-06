import { describe, it, expect } from 'vitest';
import { applyPlaceholders } from '../applyPlaceholders.js';

describe('applyPlaceholders', () => {
  it('replaces X with a number between 3 and 72 (inclusive) when config specifies that range', () => {
    const item = { phrase: "You'll know in X hours.", config: 'X = random value from 3 to 72 hours' };
    for (let i = 0; i < 100; i++) {
      const result = applyPlaceholders(item);
      const match = result.phrase.match(/You'll know in (\d+) hours\./);
      expect(match).not.toBeNull();
      const n = Number(match[1]);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(72);
    }
  });

  it('replaces Y with the current time when config says so', () => {
    const item = { phrase: "It's Y. Maybe that's your answer.", config: 'Y = current local time from device' };
    const fixedTime = new Date('2026-01-13T15:05:00');
    const result = applyPlaceholders(item, fixedTime);
    expect(result.phrase).not.toContain('Y');
    expect(result.phrase).toMatch(/3:05\s*PM/i);
  });

  it('leaves the phrase unchanged when there is no config', () => {
    const item = { phrase: 'Yes.', config: null };
    const result = applyPlaceholders(item);
    expect(result.phrase).toBe('Yes.');
  });

  it('does not touch an unrelated capital letter that happens to spell a word', () => {
    const item = { phrase: 'A little dramatic, don\'t you think?', config: null };
    const result = applyPlaceholders(item);
    expect(result.phrase).toBe(item.phrase);
  });
});
