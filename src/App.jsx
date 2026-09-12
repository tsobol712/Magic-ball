import { useEffect, useState } from 'react';
import Splash from './components/Splash.jsx';
import MagicBall from './components/MagicBall.jsx';
import Stars from './components/Stars.jsx';
import Disclaimer from './components/Disclaimer.jsx';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Placeholder for real readiness checks (fonts, image preload, etc.)
    // — right now there's nothing to await, so mark ready immediately.
    // Splash still enforces its own 1.5s minimum regardless.
    setAppReady(true);
  }, []);

  return (
    <div className="app-root">
      {showSplash && <Splash isAppReady={appReady} onDone={() => setShowSplash(false)} />}

      {!showSplash && (
        <main className="main-screen">
          <Stars />
          <p className="eyebrow">
            Ask your question out loud,
            <br />
            then shake or tap the ball.
          </p>
          <MagicBall />
          <Disclaimer />
        </main>
      )}

      <style>{`
        .app-root{
          height:100%;
        }
        .main-screen{
          height:100%;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          padding:24px;
          position:relative;
        }
        .eyebrow{
          position:relative;
          z-index:1;
          font-size:12px;
          color:var(--muted);
          letter-spacing:0.03em;
          margin:0 0 36px;
          text-align:center;
        }
      `}</style>
    </div>
  );
}
