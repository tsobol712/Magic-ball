# Development Notes

## Project structure
```
src/
  App.jsx                — splash → main screen
  components/
    Splash.jsx            — splash screen (min. 1.5s)
    MagicBall.jsx          — the ball: animation, text-fit, sound
    Stars.jsx               — twinkling star background
    Disclaimer.jsx            — "About this app" footer link + text
  data/
    responses.json           — 360 phrases (from the source spreadsheet), with weights and context
    pickResponse.js            — context-aware phrase selection logic
  utils/
    audio.js                     — shared audio manager (splash sound, reveal sound, autoplay unlock)
  assets/
    ball.png                      — ball artwork
    splash.jpg                     — splash screen artwork
```

## Tests
- `npm test` — unit tests (Vitest) for phrase-selection logic: weights, time/day context, excluding broken multi-step entries. No browser needed.
- `npm run test:e2e` — end-to-end tests (Playwright) in a real browser: splash flow, tap/shake reveal with bounds-checking, disclaimer, no double-fire on shake. Requires `npx playwright install` before the first run.

Both suites ran before every release — see the test report and test case catalog (linked from the main README) for what they actually caught.

## Sound
1. Rename whatever file you download to `reveal` + its real extension (`reveal.mp3`, `reveal.wav`, or `reveal.ogg`) and drop it in `public/sounds/`. The code finds it automatically — no code changes needed, now or next time you swap it.
2. Same convention for the splash screen's sound: `splash.mp3` / `.wav` / `.ogg` in `public/sounds/`. It keeps fading out in the background even after the splash screen itself is gone, and gets cut off the moment the person actually taps or shakes the ball.
3. Different sounds per phrase category (optional) — add entries to `SOUND_MAP_BY_CATEGORY` near the top of `MagicBall.jsx`.
4. Mobile browsers (iOS Safari especially) block audio from autoplaying without a prior tap — the splash sound is best-effort and may simply not play on a first-ever visit. Not a bug, a platform restriction.

## Platform compatibility

| Feature | iPhone, browser (Safari) | iPhone, app (after Capacitor) | Android, browser (Chrome) | Android, app (after Capacitor) |
|---|---|---|---|---|
| Shake detection | Works, but requires an explicit permission prompt on the first tap (iOS system dialog) | Works, usually without that prompt | Works immediately, no permission needed | Works |
| Reveal sound (tap/shake) | Works, but only after being "unlocked" by a real tap — universal browser autoplay policy, not Safari-specific | Likely works freely (not tied to a page load) | Also requires a first tap (same universal policy applies here too) | Likely works freely |
| Splash sound (plays on load, no tap yet) | Won't play — no real user gesture has happened yet on the page | Likely plays — launching the app itself counts as deliberate intent | Also likely won't play, same reasoning | Likely plays |
| Vibration | Doesn't work at all — Safari has never implemented the Vibration API | Works, via the native Haptics API | Works | Works |

Autoplay-blocking isn't a Safari quirk — it's a universal browser policy since 2017–2019 (Chrome, Firefox, Safari all enforce it, Safari most strictly) that blocks unmuted audio unless it follows a real user gesture (tap/click) on that page. Our code already handles this correctly: the very first tap silently "unlocks" audio for the rest of the session (see `unlockAudioPlayback()` in `utils/audio.js`), which is the standard, correct workaround — not a bug or an afterthought.

## Known gaps (see spec, P1/P2)
- ~17 of the 360 phrases (the longest, most verbose ones) don't fit the triangle cleanly even at the smallest readable font — a content-length tradeoff, not a rendering bug. Full list in the test report.
- Multi-step "quest" phrases (conditional branches, timed reveals) are excluded from the pool entirely for now — they need dedicated step-by-step UI, not just a text display.
- Battery-level context is not implemented and out of scope entirely — iOS Safari has never supported the Battery Status API, so it's not viable for the primary target platform.

## Running locally (optional)
```
npm install
npm run dev
```
Not required for deployment — Vercel builds from GitHub automatically on every push.
