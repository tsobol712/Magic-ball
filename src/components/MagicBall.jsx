import { useRef, useState, useCallback, useEffect } from 'react';
import ballImg from '../assets/ball.png';
import { pickResponse } from '../data/pickResponse.js';
import { unlockAudioPlayback, playRevealSound } from '../utils/audio.js';

// Triangle corners measured directly from the ball artwork (see
// magic_ball_ai_collab_retrospective.md for how these were calibrated —
// manual pixel marking on the actual image, not guessed).
const TRI = {
  apex: [0.500, 0.250],
  left: [0.297, 0.625],
  right: [0.703, 0.625],
};
const triTopFrac = TRI.apex[1];
const triBaseFrac = TRI.left[1];
const triHeightFrac = triBaseFrac - triTopFrac;
const triBaseWidthFrac = TRI.right[0] - TRI.left[0];
const SAFETY = 0.78;

function widthAtYFrac(yFrac) {
  if (yFrac <= triTopFrac) return 0;
  if (yFrac >= triBaseFrac) return triBaseWidthFrac;
  return triBaseWidthFrac * ((yFrac - triTopFrac) / triHeightFrac);
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern); // no-op on iOS Safari — platform limitation
}

// ============================================================

// SHAKE DETECTION
// On iPhone (iOS 13+), reading motion sensors requires the user to grant
// permission, and Safari only allows asking for that permission in direct
// response to a tap/click — it can't be requested silently on load. So we
// ask on the very first tap of the ball. If the person denies it (or is on
// an iOS version that doesn't support the sensor at all), the app simply
// stays tap-only — nothing else breaks.
// ============================================================
const SHAKE_THRESHOLD = 16; // m/s² of acceleration change — tuned to need a real shake, not a bump
const HARD_SHAKE_THRESHOLD = 36; // above this, classify the shake as "hard" rather than "low"
const SHAKE_CALM_THRESHOLD = 3; // below this counts as "settled down"
const SHAKE_MIN_GAP_MS = 1200; // minimum time before we'll even consider re-arming

function needsIOSMotionPermission() {
  return typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
}

async function ensureMotionPermission() {
  if (!needsIOSMotionPermission()) return true; // Android / older iOS — no prompt needed
  try {
    const result = await DeviceMotionEvent.requestPermission();
    return result === 'granted';
  } catch {
    return false; // user denied, or API unavailable — fall back to tap-only
  }
}

const measureCanvas = document.createElement('canvas');
const measureCtx = measureCanvas.getContext('2d');

// Wraps text top-to-bottom where each row is allowed a DIFFERENT max width
// (rowWidthsTopDown[0] = width for the first/topmost row of this attempt,
// etc — narrower rows first, since that's how the triangle actually looks).
function wrapWithRowWidths(text, fontPx, rowWidthsTopDown) {
  measureCtx.font = `600 ${fontPx}px 'Space Grotesk', sans-serif`;
  if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = `${fontPx * 0.01}px`;
  const words = text.split(' ');
  const lines = [];
  let current = '';
  let rowIndex = 0;
  const widthFor = (i) => rowWidthsTopDown[Math.min(i, rowWidthsTopDown.length - 1)];

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (measureCtx.measureText(test).width > widthFor(rowIndex) && current) {
      lines.push(current);
      rowIndex++;
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitAndPlace(ballSizePx, text) {
  const bottomLimitFrac = triBaseFrac - 0.015;
  const topLimitFrac = triTopFrac + 0.015;

  let lastAttempt = null;

  for (let fontPx = 22; fontPx >= 8; fontPx--) {
    const lineHeightFrac = (fontPx * 1.22) / ballSizePx;
    const maxRows = Math.floor((bottomLimitFrac - topLimitFrac) / lineHeightFrac);
    if (maxRows < 1) continue;

    // Width available for each possible row, counting from the BOTTOM
    // (row 0 = bottommost/widest row) up to the apex (narrowest).
    const rowWidthsBottomUp = [];
    for (let r = 0; r < maxRows; r++) {
      const rowTopFrac = bottomLimitFrac - (r + 1) * lineHeightFrac; // this row's narrower (top) edge
      rowWidthsBottomUp.push(widthAtYFrac(rowTopFrac) * ballSizePx * SAFETY);
    }
    const rowWidthsTopDown = [...rowWidthsBottomUp].reverse();

    // Text is anchored to the bottom (always plenty of room there) and only
    // grows upward into the narrower part of the triangle if it has to.
    // Try using just the bottom-most row first, then two rows, etc. — the
    // smallest number of (wide, bottom) rows that the phrase actually fits
    // into wins, instead of always assuming the narrow top is in play.
    let lines = null;
    for (let n = 1; n <= maxRows; n++) {
      const widthsForAttempt = rowWidthsTopDown.slice(maxRows - n);
      const candidate = wrapWithRowWidths(text, fontPx, widthsForAttempt);
      if (candidate.length <= n) {
        lines = candidate;
        break;
      }
    }

    if (lines) {
      const blockHeightFrac = lines.length * lineHeightFrac;
      const result = {
        fontPx,
        lines,
        blockTopFrac: bottomLimitFrac - blockHeightFrac,
        blockBottomFrac: bottomLimitFrac,
      };
      lastAttempt = result;
      return result; // first font size that fits within maxRows always succeeds
    }
  }
  // Reached only if even the smallest readable font, using every available
  // row, still can't fit the phrase (see test report for which phrases).
  return (
    lastAttempt || {
      fontPx: 8,
      lines: [text],
      blockTopFrac: topLimitFrac,
      blockBottomFrac: bottomLimitFrac,
    }
  );
}

// Dev-only hook so the fitting logic can be tested directly against exact
// phrases, instead of waiting for random taps to happen to pick them.
// Left in the production bundle deliberately (tiny cost) — the e2e suite
// exercises it against the built app, not just the dev server.
window.__debugFit = (text, ballSizePx = 300) => fitAndPlace(ballSizePx, text);

export default function MagicBall() {
  const ballRef = useRef(null);
  const [shaking, setShaking] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState([]);
  const [fontPx, setFontPx] = useState(16);
  const [topPercent, setTopPercent] = useState(50);
  const [widthPx, setWidthPx] = useState(0);

  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });
  const lastShakeTimeRef = useRef(0);
  const armedRef = useRef(false); // starts unarmed — must see calm motion once before the first shake can trigger
  const revealRef = useRef(() => {});

  const reveal = useCallback((shakeIntensity = null) => {
    if (busy) return;
    setBusy(true);
    setActive(false);
    setShaking(true);

    setTimeout(() => {
      const item = pickResponse(new Date(), shakeIntensity);
      const ballSizePx = ballRef.current.getBoundingClientRect().width;
      const fit = fitAndPlace(ballSizePx, item.phrase);

      setFontPx(fit.fontPx);
      setLines(fit.lines);
      setTopPercent(fit.blockTopFrac * 100);
      setWidthPx(widthAtYFrac(fit.blockBottomFrac) * ballSizePx * SAFETY);

      playRevealSound();
      vibrate(40);
      setShaking(false);
      setActive(true);
      setBusy(false);
    }, 600);
  }, [busy]);

  // keep a stable reference to the latest reveal() for the devicemotion
  // listener below, which is only attached once
  revealRef.current = reveal;

  const handleMotion = useCallback((event) => {
    const now = Date.now();
    const accel = event.accelerationIncludingGravity || event.acceleration;
    if (!accel) return;

    const last = lastAccelRef.current;
    const delta =
      Math.abs((accel.x || 0) - last.x) +
      Math.abs((accel.y || 0) - last.y) +
      Math.abs((accel.z || 0) - last.z);

    lastAccelRef.current = { x: accel.x || 0, y: accel.y || 0, z: accel.z || 0 };

    if (!armedRef.current) {
      // Not allowed to trigger yet — waiting for the phone to actually
      // settle down (not just for time to pass), so residual wobble right
      // after a shake can't sneak in as a second, unintended trigger.
      if (delta < SHAKE_CALM_THRESHOLD && now - lastShakeTimeRef.current > SHAKE_MIN_GAP_MS) {
        armedRef.current = true;
      }
      return;
    }

    if (delta > SHAKE_THRESHOLD) {
      lastShakeTimeRef.current = now;
      armedRef.current = false;
      const intensity = delta > HARD_SHAKE_THRESHOLD ? 'hard' : 'low';
      revealRef.current(intensity);
    }
  }, []);

  const motionAttachedRef = useRef(false);

  const attachMotionIfGranted = useCallback(async () => {
    if (motionAttachedRef.current) return;
    const granted = await ensureMotionPermission();
    if (granted && !motionAttachedRef.current) {
      motionAttachedRef.current = true;
      window.addEventListener('devicemotion', handleMotion);
    }
    // if denied or unsupported — silently stay tap-only, no error shown
  }, [handleMotion]);

  useEffect(() => {
    // If the person already granted motion permission in an earlier visit,
    // most browsers let us reuse that grant without a fresh tap — so try
    // right away. If this is the very first-ever grant, the browser will
    // reject this silent attempt (no user gesture), and attachMotionIfGranted
    // simply gets called again on the first real tap below, which works
    // because a click IS a user gesture.
    attachMotionIfGranted();
  }, [attachMotionIfGranted]);

  return (
    <div
      className="ball-stage"
      onClick={() => {
        unlockAudioPlayback(); // must happen synchronously inside a real click, not after an await
        attachMotionIfGranted();
        reveal();
      }}
    >
      <img ref={ballRef} src={ballImg} alt="Magic ball" className={`ball-img ${shaking ? 'shaking' : ''}`} />

      <div className={`glow-fill ${active ? 'glow-fill--active' : ''}`} />

      <div className="die-text-zone" style={{ top: `${topPercent}%`, width: widthPx ? `${widthPx}px` : undefined }}>
        <div className={`answer ${active ? 'answer--show' : ''}`} style={{ fontSize: `${fontPx}px` }}>
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .ball-stage{
          position:relative;
          z-index:1;
          width:min(78vw, 320px);
          aspect-ratio:1/1;
          cursor:pointer;
          -webkit-tap-highlight-color:transparent;
        }
        .ball-img{
          position:relative;
          width:100%;
          height:100%;
          border-radius:50%;
          display:block;
          object-fit:cover;
          transition:transform 0.15s ease;
        }
        .ball-stage:active .ball-img{ transform:scale(0.98); }
        .ball-img.shaking{ animation:shake 0.6s ease; }

        @keyframes shake{
          0%{transform:rotate(0deg) translateX(0);}
          15%{transform:rotate(-5deg) translateX(-7px);}
          30%{transform:rotate(5deg) translateX(7px);}
          45%{transform:rotate(-3.5deg) translateX(-4px);}
          60%{transform:rotate(3.5deg) translateX(4px);}
          75%{transform:rotate(-1.5deg) translateX(-2px);}
          100%{transform:rotate(0deg) translateX(0);}
        }

        .glow-fill{
          position:absolute;
          inset:0;
          clip-path:polygon(50% 25%, 70.3% 62.5%, 29.7% 62.5%);
          background:radial-gradient(ellipse at 50% 60%, rgba(183,156,255,0.32) 0%, rgba(183,156,255,0) 72%);
          opacity:0;
          transition:opacity 0.5s ease;
          pointer-events:none;
        }
        .glow-fill--active{ opacity:1; }

        .die-text-zone{
          position:absolute;
          left:50%;
          transform:translateX(-50%);
          text-align:center;
          pointer-events:none;
        }

        .answer{
          line-height:1.22;
          font-weight:600;
          letter-spacing:0.01em;
          color:var(--ink);
          opacity:0;
          filter:blur(5px);
          transition:opacity 0.6s ease, filter 0.6s ease;
          word-break:break-word;
          text-shadow:
            0 0 4px rgba(230,220,255,0.9),
            0 0 14px rgba(183,156,255,0.75),
            0 0 30px rgba(138,108,224,0.45);
        }
        .answer--show{
          opacity:1;
          filter:blur(0px);
        }
      `}</style>
    </div>
  );
}
