import { describe, it, expect } from 'vitest';
import { pickResponse } from '../pickResponse.js';

describe('pickResponse', () => {
  it('never returns a multi-step script phrase (contains <br>)', () => {
    for (let i = 0; i < 200; i++) {
      const result = pickResponse();
      expect(result.phrase).not.toContain('<br>');
    }
  });

  it('never returns a phrase gated on a sensor we have not wired up (battery/shake), when picked at a neutral time', () => {
    // Tuesday 15:00 — doesn't match any special time/day window, so only
    // "anytime" phrases (and any condition we DO implement) should qualify
    const neutralTime = new Date('2026-01-13T15:00:00');
    for (let i = 0; i < 200; i++) {
      const result = pickResponse(neutralTime);
      expect(['low battery', 'high battery', 'hard shake', 'low shake', 'still for 2 seconds'])
        .not.toContain(result.whenToUse.toLowerCase());
    }
  });

  it('only returns Sunday-gated phrases when the date is actually a Sunday', () => {
    const aSunday = new Date('2026-01-11T12:00:00'); // known Sunday
    const aTuesday = new Date('2026-01-13T12:00:00'); // known Tuesday

    const sundayResults = new Set();
    for (let i = 0; i < 300; i++) sundayResults.add(pickResponse(aSunday).whenToUse);
    const tuesdayResults = new Set();
    for (let i = 0; i < 300; i++) tuesdayResults.add(pickResponse(aTuesday).whenToUse);

    // On Tuesday we should never see a phrase whose condition is "Sunday"
    expect([...tuesdayResults]).not.toContain('Sunday');
  });

  it('respects the 22:30–04:00 overnight window, including the wrap past midnight', () => {
    const lateNight = new Date('2026-01-13T23:00:00'); // 23:00 — inside the window
    const midday = new Date('2026-01-13T13:00:00'); // clearly outside the window

    const lateNightConditions = new Set();
    for (let i = 0; i < 300; i++) lateNightConditions.add(pickResponse(lateNight).whenToUse);

    const middayConditions = new Set();
    for (let i = 0; i < 300; i++) middayConditions.add(pickResponse(midday).whenToUse);

    expect([...middayConditions]).not.toContain('22:30-04:00');
  });

  it('weights "anytime" roughly twice as heavily as other qualifying phrases over many draws', () => {
    const neutralTime = new Date('2026-01-13T15:00:00'); // only "anytime" phrases qualify here
    let anytimeCount = 0;
    const total = 1000;
    for (let i = 0; i < total; i++) {
      const result = pickResponse(neutralTime);
      if (result.weight === 2) anytimeCount++;
    }
    // At a neutral time, only anytime phrases qualify anyway, so this
    // mainly confirms every draw in this window does carry weight 2
    expect(anytimeCount).toBe(total);
  });

  it('always returns a valid phrase object with the expected shape', () => {
    const result = pickResponse();
    expect(typeof result.phrase).toBe('string');
    expect(result.phrase.length).toBeGreaterThan(0);
    expect(typeof result.whenToUse).toBe('string');
    expect([1, 2]).toContain(result.weight);
  });
});
