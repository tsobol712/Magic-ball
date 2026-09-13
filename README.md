# Ask Sarcastic Magic Ball

A no-nonsense fortune ball for your phone — sarcastic, context-aware answers, zero data collection, no account, no ads (yet).

**Live**: _add your Vercel URL here_

Built as a solo product/dev project — from problem statement to shipped, tested MVP — using Claude as a development partner. Process docs (spec, AI-collaboration retrospective, test reports) linked at the bottom.

## Why this exists
Existing "magic ball" apps lean on a lazy "ask again later" response, cluttered ads, and a clichéd starfield look. This one guarantees a real answer every time, keeps the whole interaction on-device (nothing about your question is ever sent anywhere), and is built around a specific sense of humor instead of generic fortune-telling.

## Tech stack
- React + Vite, no backend — the entire response pool ships with the app
- Deployed on Vercel, auto-deploying from this repo
- Vitest for logic unit tests, Playwright for e2e (splash, tap/shake flow, text-fit, disclaimer)

## Status
MVP — core flow (splash → ask → shake or tap → answer) is live and tested. Mobile app wrapper (Capacitor/App Store) is an open decision, not committed to. See `magic_ball_spec_v1.md` for full scope and open questions.

## Process documentation
This project was built with a deliberate spec → build → test loop, documented for portfolio purposes:
- Product spec (user stories, requirements, acceptance criteria)
- AI collaboration retrospective — what went wrong and how it got debugged
- Test report + test case catalog

---

## Структура проекта
```
src/
  App.jsx                — заставка → главный экран
  components/
    Splash.jsx           — заставка (мин. 1.5 сек)
    MagicBall.jsx         — сам шар: анимация, подгонка текста, звук
    Stars.jsx             — фон с мерцающими звёздами
  data/
    responses.json        — 364 фразы (из xlsx), с весами и контекстом
    pickResponse.js        — логика выбора фразы под текущий контекст
  assets/
    ball.png               — картинка шара
    splash.jpg              — картинка для заставки
```

## Тесты
- `npm test` — юнит-тесты (Vitest) для логики выбора фразы: веса, контекст по времени/дню, исключение "битых" мини-квестов. Не требуют браузера.
- `npm run test:e2e` — end-to-end тесты (Playwright) в реальном браузере: заставка, тап и проверка границ текста, дисклеймер, тряска без двойного срабатывания. Требуют `npx playwright install` перед первым запуском (скачивает браузер).

Оба набора прогонялись перед каждым релизом — детали и находки см. в test-report/test-checklist в документации проекта.

## Как добавить/поменять звук
1. Скачал новый звук — переименуй файл в `reveal` + его настоящее расширение (`reveal.mp3`, `reveal.wav` или `reveal.ogg` — какой формат реально скачал, такое и расширение) и положи в `public/sounds/`.
2. Код сам находит файл по этому имени — **ничего в коде менять не нужно**, ни сейчас, ни при следующей замене звука.
3. Разные звуки под разные категории фраз (по желанию, позже) — впиши пары в `SOUND_MAP_BY_CATEGORY` в начале `MagicBall.jsx`.

## Что ещё не реализовано (см. спек, P1/P2)
- Контекст по заряду батареи и силе тряски — сенсоры пока не подключены, такие фразы временно не показываются (см. `pickResponse.js`, `NOT_YET_IMPLEMENTED`).
- Вибрация подключена (`navigator.vibrate`), но не сработает в Safari на iOS — ограничение платформы.

## Запуск локально (не обязательно)
Если однажды поставишь Node.js:
```
npm install
npm run dev
```
Без этого тоже нормально — просто загружаешь файлы в GitHub, Vercel сам всё соберёт.
