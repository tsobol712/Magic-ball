// Some phrases in the source spreadsheet contain placeholders that need a
// real value substituted in at the moment they're shown — e.g. "You'll
// know in X hours." needs a real random number instead of the letter X.
// This was tracked in the `config` field during the xlsx → JSON
// conversion, but the actual substitution was never wired up until now.

function formatCurrentTime(now) {
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Given a response item ({ phrase, config, ... }) and the current time,
 * returns the phrase with any placeholders replaced by real values.
 * Items with no matching config are returned unchanged.
 */
export function applyPlaceholders(item, now = new Date()) {
  let phrase = item.phrase;

  if (item.config) {
    const rangeMatch = item.config.match(/random value from (\d+) to (\d+)/);
    if (rangeMatch) {
      const lo = Number(rangeMatch[1]);
      const hi = Number(rangeMatch[2]);
      const n = Math.floor(Math.random() * (hi - lo + 1)) + lo;
      phrase = phrase.replace(/\bX\b/g, String(n));
    }

    if (item.config.includes('current local time from device')) {
      phrase = phrase.replace(/\bY\b/g, formatCurrentTime(now));
    }
  }

  return { ...item, phrase };
}
