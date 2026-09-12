import responses from './responses.json';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Sensor-based conditions (battery level, shake intensity) aren't wired up
// yet — see spec P0/P1. Phrases that require them are excluded from the
// pool for now rather than shown at the wrong moment.
const NOT_YET_IMPLEMENTED = new Set([
  'low battery',
  'high battery',
  'hard shake',
  'low shake',
  'still for 2 seconds',
]);

function isMultiStepScript(phrase) {
  // Some rows in the source spreadsheet aren't single displayable answers —
  // they're multi-step quest scripts (conditional YES/NO branches, timed
  // reveal sequences) with literal "<br>" tags and author notes baked into
  // the "Phrase" column. Showing these as-is would leak raw markup and
  // Russian production notes to the end user. Excluded until they get
  // dedicated step-by-step UI (see test report — Known Issues).
  return phrase.includes('<br>');
}

function timeInRange(nowMinutes, startMinutes, endMinutes) {
  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }
  // range wraps past midnight, e.g. 22:30–04:00
  return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
}

function parseTimeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function isConditionActiveNow(whenToUse, now) {
  const value = whenToUse.trim();
  const lower = value.toLowerCase();

  if (lower === 'anytime') return true;

  if (NOT_YET_IMPLEMENTED.has(lower)) return false;

  if (DAY_NAMES.includes(value)) {
    return DAY_NAMES[now.getDay()] === value;
  }

  const rangeMatch = value.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (rangeMatch) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return timeInRange(nowMinutes, parseTimeToMinutes(rangeMatch[1]), parseTimeToMinutes(rangeMatch[2]));
  }

  if (lower.startsWith('evening after')) {
    const hourMatch = value.match(/(\d{1,2}):(\d{2})/);
    if (hourMatch) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      return nowMinutes >= parseTimeToMinutes(`${hourMatch[1]}:${hourMatch[2]}`);
    }
  }

  // unrecognized condition — safest default is to not show it, rather than
  // show it at a random/wrong moment
  return false;
}

/**
 * Returns a random phrase object, weighted, from among the phrases whose
 * whenToUse condition is true right now (anytime phrases always qualify,
 * with double weight as per the spec).
 */
export function pickResponse(now = new Date()) {
  const pool = responses
    .filter((r) => !isMultiStepScript(r.phrase))
    .filter((r) => isConditionActiveNow(r.whenToUse, now));
  const candidates = pool.length > 0 ? pool : responses.filter((r) => r.whenToUse === 'anytime' && !isMultiStepScript(r.phrase));

  const totalWeight = candidates.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const item of candidates) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return candidates[candidates.length - 1];
}
