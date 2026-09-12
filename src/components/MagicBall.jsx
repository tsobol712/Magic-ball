import { useRef, useState, useCallback } from 'react';
import ballImg from '../assets/ball.png';
import { pickResponse } from '../data/pickResponse.js';

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
const SAFETY = 0.74;

function widthAtYFrac(yFrac) {
  if (yFrac <= triTopFrac) return 0;
  if (yFrac >= triBaseFrac) return triBaseWidthFrac;
  return triBaseWidthFrac * ((yFrac - triTopFrac) / triHeightFrac);
}

// ============================================================
// SOUND — change just this one path to swap the sound file.
// Put the file in /public/sounds/ so this path resolves.
// ============================================================
const SOUND_FILE = '/sounds/reveal.mp3';
const ENABLE_SOUND = true;
const SOUND_MAP_BY_CATEGORY = {
  // Sarcastic: '/sounds/sarcastic-pop.mp3',
};

function playSound(category) {
  if (!ENABLE_SOUND) return;
  const src = SOUND_MAP_BY_CATEGORY[category] || SOUND_FILE;
  const audio = new Audio(src);
  audio.volume = 0.5;
  audio.play().catch(() => {});
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
const SHAKE_COOLDOWN_MS = 1200;

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

function wrapAtWidth(text, fontPx, maxWidthPx) {
  measureCtx.font = `600 ${fontPx}px 'Space Grotesk', sans-serif`;
  if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = `${fontPx * 0.01}px`;
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (measureCtx.measureText(test).width > maxWidthPx && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitAndPlace(ballSizePx, text) {
  const bottomLimitFrac = triBaseFrac - 0.05;
  const topLimitFrac = triTopFrac + 0.05;
  const midFrac = (topLimitFrac + bottomLimitFrac) / 2;

  for (let fontPx = 22; fontPx >= 9; fontPx--) {
    const lineHeightFrac = (fontPx * 1.22) / ballSizePx;

    let blockTopGuess = midFrac - lineHeightFrac;
    let maxWidthPx = widthAtYFrac(blockTopGuess) * ballSizePx * SAFETY;
    let lines = wrapAtWidth(text, fontPx, maxWidthPx);

    let blockHeightFrac = lines.length * lineHeightFrac;
    let blockTopFrac = midFrac - blockHeightFrac / 2;
    let blockBottomFrac = midFrac + blockHeightFrac / 2;
    const refinedMaxWidthPx = widthAtYFrac(blockTopFrac) * ballSizePx * SAFETY;
    lines = wrapAtWidth(text, fontPx, refinedMaxWidthPx);
    blockHeightFrac = lines.length * lineHeightFrac;
    blockTopFrac = midFrac - blockHeightFrac / 2;
    blockBottomFrac = midFrac + blockHeightFrac / 2;

    const widest = Math.max(...lines.map((l) => measureCtx.measureText(l).width));

    if (blockTopFrac >= topLimitFrac && blockBottomFrac <= bottomLimitFrac && widest <= refinedMaxWidthPx) {
      return { fontPx, lines, blockTopFrac, blockBottomFrac };
    }
  }
  const fontPx = 9;
  const lineHeightFrac = (fontPx * 1.22) / ballSizePx;
  const lines = wrapAtWidth(text, fontPx, widthAtYFrac(midFrac) * ballSizePx * SAFETY);
  const blockHeightFrac = lines.length * lineHeightFrac;
  return { fontPx, lines, blockTopFrac: midFrac - blockHeightFrac / 2, blockBottomFrac: midFrac + blockHeightFrac / 2 };
}

export default function MagicBall() {
  const ballRef = useRef(null);
  const [shaking, setShaking] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState([]);
  const [fontPx, setFontPx] = useState(16);
  const [topPercent, setTopPercent] = useState(50);
  const [widthPx, setWidthPx] = useState(0);

  const motionRequestedRef = useRef(false);
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });
  const lastShakeTimeRef = useRef(0);
  const revealRef = useRef(() => {});

  const reveal = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setActive(false);
    setShaking(true);

    setTimeout(() => {
      const item = pickResponse();
      const ballSizePx = ballRef.current.getBoundingClientRect().width;
      const fit = fitAndPlace(ballSizePx, item.phrase);

      setFontPx(fit.fontPx);
      setLines(fit.lines);
      setTopPercent(fit.blockTopFrac * 100);
      setWidthPx(widthAtYFrac(fit.blockBottomFrac) * ballSizePx * SAFETY);

      playSound(item.category);
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
    if (now - lastShakeTimeRef.current < SHAKE_COOLDOWN_MS) return;

    const accel = event.accelerationIncludingGravity || event.acceleration;
    if (!accel) return;

    const last = lastAccelRef.current;
    const delta =
      Math.abs((accel.x || 0) - last.x) +
      Math.abs((accel.y || 0) - last.y) +
      Math.abs((accel.z || 0) - last.z);

    lastAccelRef.current = { x: accel.x || 0, y: accel.y || 0, z: accel.z || 0 };

    if (delta > SHAKE_THRESHOLD) {
      lastShakeTimeRef.current = now;
      revealRef.current();
    }
  }, []);

  const handleFirstInteraction = useCallback(async () => {
    if (motionRequestedRef.current) return;
    motionRequestedRef.current = true;
    const granted = await ensureMotionPermission();
    if (granted) {
      window.addEventListener('devicemotion', handleMotion);
    }
    // if denied or unsupported — silently stay tap-only, no error shown
  }, [handleMotion]);

  return (
    <div
      className="ball-stage"
      onClick={() => {
        handleFirstInteraction();
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
