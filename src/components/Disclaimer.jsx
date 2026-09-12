import { useState } from 'react';

const DISCLAIMER_TEXT = `This app is for entertainment purposes only and isn't a substitute for professional advice.

If you're going through a hard time, please reach out to a mental health professional or a crisis line — for example, 988 in the US, or the equivalent helpline in your country.`;

export default function Disclaimer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="disclaimer-link" onClick={() => setOpen(true)}>
        About this app
      </button>

      {open && (
        <div className="disclaimer-overlay" onClick={() => setOpen(false)}>
          <div className="disclaimer-box" onClick={(e) => e.stopPropagation()}>
            <p>{DISCLAIMER_TEXT}</p>
            <button className="disclaimer-close" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        .disclaimer-link{
          position:fixed;
          bottom:16px;
          left:50%;
          transform:translateX(-50%);
          z-index:2;
          background:none;
          border:none;
          color:var(--muted);
          font-family:var(--font);
          font-size:11px;
          letter-spacing:0.02em;
          text-decoration:underline;
          opacity:0.6;
          cursor:pointer;
          padding:8px;
        }
        .disclaimer-overlay{
          position:fixed;
          inset:0;
          z-index:50;
          background:rgba(0,0,0,0.7);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
        }
        .disclaimer-box{
          background:#141019;
          border-radius:16px;
          padding:24px;
          max-width:340px;
        }
        .disclaimer-box p{
          color:var(--ink);
          font-size:13px;
          line-height:1.5;
          white-space:pre-line;
          margin:0 0 20px;
        }
        .disclaimer-close{
          display:block;
          width:100%;
          padding:10px;
          background:rgba(183,156,255,0.15);
          border:none;
          border-radius:8px;
          color:var(--ink);
          font-family:var(--font);
          font-size:13px;
          cursor:pointer;
        }
      `}</style>
    </>
  );
}
