import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (minTimeElapsed && isAppReady && !fadingOut) {
      setFadingOut(true);
      // let the fade-out CSS transition finish before unmounting
      const timer = setTimeout(onDone, 400);
      return () => clearTimeout(timer);
    }
  }, [minTimeElapsed, isAppReady, fadingOut, onDone]);

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
