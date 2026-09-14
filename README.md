# Ask Sarcastic Magic Ball

A fortune-ball web app that gives a real, in-character answer every time — no "ask again later," no ads, no data collection. Built end-to-end as a solo product case study: spec → build → test → ship.

**Live**: _add your Vercel URL here_

## The problem
Existing "magic ball" apps lean on a lazy fallback response, cluttered ads, and a clichéd starfield look. This one commits to always giving a real answer, keeps every interaction fully on-device (nothing about the question is ever transmitted anywhere), and has a distinct sarcastic personality instead of generic fortune-telling.

## What this project demonstrates
- **Spec-first product thinking**: user stories, P0/P1/P2 prioritization, and Given/When/Then acceptance criteria written before implementation — see `magic_ball_spec_v1.md`.
- **Real testing discipline, not just "looks fine"**: a full unit + e2e test suite (Vitest + Playwright), including a regression run against the *entire* 360-phrase content set — not just spot-checking a few examples — which is what actually caught the text-rendering edge cases documented in the test report.
- **Judgment under ambiguity**: e.g. catching a trademark-risk naming issue before committing to it, deciding what's in scope for an MVP vs. deferred (mobile app wrapper, sensor-gated content that isn't viable on the target platform), and making an explicit tradeoff call on the ~5% of content too long to fit the UI cleanly rather than silently forcing it.
- **Debugging methodology**: see `magic_ball_ai_collab_retrospective.md` for a concrete account of tracking down a bug with no console error (a stale React effect closure) versus a data-quality bug (leaked authoring notes in the source spreadsheet).

## Tech stack
React + Vite, no backend — the full response pool ships with the app, so no question ever leaves the device. Deployed on Vercel with auto-deploy from this repo.

## Process documentation
- **Product spec** — `magic_ball_spec_v1.md`
- **AI collaboration retrospective** — `magic_ball_ai_collab_retrospective.md`
- **Test report & test case catalog** — `magic_ball_test_report_v1.md`, `magic_ball_test_cases.md`

Developer-facing setup notes (project structure, how to run tests, how to swap the sound file) live in `DEVELOPMENT.md`, kept separate from this overview.
