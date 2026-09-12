import { useEffect, useRef, useState } from 'react';
import splashImg from '../assets/splash.jpg';

const MIN_DISPLAY_MS = 1500;

/**
 * Shows the splash screen for at least MIN_DISPLAY_MS, and longer if the
 * app isn't ready yet (isAppReady stays false). Calls onDone() once both
 * conditions are satisfied — whichever takes longer.
 */
export default function Splash({ isAppReady, onDone }) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const doneTriggeredRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // doneTriggeredRef (not fadingOut state) guards re-entry, so this effect
    // doesn't depend on the state it sets — otherwise the state update would
    // re-run this same effect and its cleanup would cancel the timer below
    // before it ever fires.
    if (minTimeElapsed && isAppReady && !doneTriggeredRef.current) {
      doneTriggeredRef.current = true;
      setFadingOut(true);
      const timer = setTimeout(onDone, 400);
      return () => clearTimeout(timer);
    }
  }, [minTimeElapsed, isAppReady, onDone]);

  return (
    <div className={`splash ${fadingOut ? 'splash--fading' : ''}`}>
      <img src={splashImg} alt="" className="splash__image" />

      <style>{`
        .splash{
          position:fixed;
          inset:0;
          z-index:100;
          display:flex;
          align-items:center;
          justify-content:center;
          background:#000;
          transition:opacity 0.4s ease;
          opacity:1;
        }
        .splash--fading{
          opacity:0;
          pointer-events:none;
        }
        .splash__image{
          width:100%;
          height:100%;
          object-fit:cover;
        }
      `}</style>
    </div>
  );
}
