// ============================================================
// Shared audio manager.
//
// Why this exists instead of `new Audio(src).play()` inline:
// 1. Mobile browsers block audio playback that isn't triggered directly
//    by a user gesture (tap/click). A shake (devicemotion) is NOT such a
//    gesture, so playback from a shake would silently fail unless we
//    "unlock" audio once on the very first tap.
// 2. Creating a brand-new Audio object every time adds a small loading
//    delay — reusing one preloaded element makes playback start closer
//    to instantly.
// 3. The splash sound needs to keep fading out in the background even
//    after the splash screen itself has visually gone away, but must be
//    interruptible the moment the person actually starts interacting.
// ============================================================

async function resolveSrc(candidates) {
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { method: 'HEAD' });
      if (res.ok) return candidate;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

const REVEAL_CANDIDATES = ['/sounds/reveal.mp3', '/sounds/reveal.wav', '/sounds/reveal.ogg'];
const SPLASH_CANDIDATES = ['/sounds/splash.mp3', '/sounds/splash.wav', '/sounds/splash.ogg'];

let revealAudio = null; // shared, reused element for the reveal sound
let revealSrcPromise = null;
let unlocked = false;

let splashAudio = null; // the currently-playing (or fading out) splash sound, if any

/**
 * Call this once, synchronously inside a real click/tap handler (not
 * inside an async callback) — required for iOS/Android to allow audio to
 * play later from non-gesture triggers like a shake.
 */
export function unlockAudioPlayback() {
  if (unlocked) return;
  unlocked = true;
  const silent = new Audio();
  silent.play().catch(() => {});
}

async function getRevealAudio() {
  if (!revealAudio) {
    revealSrcPromise = revealSrcPromise || resolveSrc(REVEAL_CANDIDATES);
    const src = await revealSrcPromise;
    if (!src) return null;
    revealAudio = new Audio(src);
    revealAudio.volume = 0.5;
    revealAudio.preload = 'auto';
  }
  return revealAudio;
}

// Kick off resolving+preloading the reveal sound as early as possible
// (module load), so the first real reveal doesn't pay that latency.
getRevealAudio();

export async function playRevealSound() {
  stopSplashSound(); // a real interaction always takes priority over the splash fade-out
  const audio = await getRevealAudio();
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

export async function playSplashSound() {
  const src = await resolveSrc(SPLASH_CANDIDATES);
  if (!src) return;
  splashAudio = new Audio(src);
  splashAudio.volume = 0.6;
  splashAudio.play().catch(() => {});
  splashAudio.addEventListener('ended', () => {
    splashAudio = null;
  });
}

export function stopSplashSound() {
  if (splashAudio) {
    splashAudio.pause();
    splashAudio = null;
  }
}
