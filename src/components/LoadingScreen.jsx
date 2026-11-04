import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './loadingScreen.css';

const WORD = 'ExamPulse';
const LOOP = 3500;
const MIN_SHOW_MS = 2800;
const CONFIG = {
  cube: { faceEnds: [1000, 1100, 1200], ease: 'cubic-bezier(.2,.9,.25,1.3)' },
  text: { start: 1000, stagger: 50, letterDur: 600, ease: 'cubic-bezier(.34,1.8,.64,1)' },
  shimmer: { start: 2200, end: 3200, flash: 320 },
  hue: [185, 265],
};

function offset(ms) {
  return Math.min(1, Math.max(0, ms / LOOP));
}

function LoadingMark() {
  const rootRef = useRef(null);
  const glowRef = useRef(null);
  const ringRef = useRef(null);
  const cubeRef = useRef(null);
  const charsRef = useRef([]);
  const barRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const chars = charsRef.current.filter(Boolean);
    const faces = [...root.querySelectorAll('.ep-boot-face')];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const anims = [];
    const run = (el, frames) => {
      if (!el) return null;
      const a = el.animate(frames, { duration: LOOP, iterations: Infinity });
      anims.push(a);
      return a;
    };

    if (!reduce) {
      const T0 = 'translate(0px,0px) rotate(0deg) scale(1)';
      const lockAt = Math.max(...CONFIG.cube.faceEnds);
      faces.forEach((face, i) => {
        const dx = face.getAttribute('data-dx');
        const dy = face.getAttribute('data-dy');
        const r = face.getAttribute('data-r');
        const end = CONFIG.cube.faceEnds[i];
        run(face, [
          { offset: 0, transform: `translate(${dx}px,${dy}px) rotate(${r}deg) scale(1.3)`, easing: CONFIG.cube.ease },
          { offset: offset(end), transform: T0 },
          { offset: 1, transform: T0 },
        ]);
        run(face, [
          { offset: 0, opacity: 0 },
          { offset: offset(260), opacity: 1 },
          { offset: 1, opacity: 1 },
        ]);
      });
      run(cubeRef.current, [
        { offset: 0, transform: 'scale(1)' },
        { offset: offset(lockAt), transform: 'scale(1)', easing: 'ease-out' },
        { offset: offset(lockAt + 140), transform: 'scale(1.08)', easing: 'ease-in-out' },
        { offset: offset(lockAt + 420), transform: 'scale(1)' },
        { offset: 1, transform: 'scale(1)' },
      ]);
      run(glowRef.current, [
        { offset: 0, opacity: 0 },
        { offset: offset(lockAt), opacity: 0, easing: 'ease-out' },
        { offset: offset(lockAt + 200), opacity: 0.9 },
        { offset: offset(CONFIG.shimmer.start), opacity: 0.4 },
        { offset: 1, opacity: 0.4 },
      ]);
      run(ringRef.current, [
        { offset: 0, opacity: 0, transform: 'scale(.6)' },
        { offset: offset(lockAt), opacity: 0.7, transform: 'scale(.6)', easing: 'ease-out' },
        { offset: offset(lockAt + 800), opacity: 0, transform: 'scale(1.9)' },
        { offset: 1, opacity: 0, transform: 'scale(1.9)' },
      ]);

      const { start, stagger, letterDur, ease } = CONFIG.text;
      const { start: ss, end: se, flash } = CONFIG.shimmer;
      const n = Math.max(chars.length, 1);
      const step = (se - ss - flash) / (n - 1);
      const clear = '0 0 0 rgba(255,255,255,0)';
      chars.forEach((ch, i) => {
        const t0 = start + i * stagger;
        const t1 = t0 + letterDur;
        const s0 = ss + i * step;
        const s1 = s0 + flash / 2;
        const s2 = s0 + flash;
        const hue = CONFIG.hue[0] + ((CONFIG.hue[1] - CONFIG.hue[0]) * i) / (n - 1);
        const neon = `hsl(${hue} 95% 72%)`;
        run(ch, [
          { offset: 0, transform: 'translateY(140%)', color: '#fff', textShadow: clear },
          { offset: offset(t0), transform: 'translateY(140%)', easing: ease },
          { offset: offset(t1), transform: 'translateY(0)' },
          { offset: offset(s0), transform: 'translateY(0)', color: '#fff', textShadow: clear, easing: 'ease-out' },
          { offset: offset(s1), color: neon, textShadow: `0 0 18px ${neon}`, easing: 'ease-in' },
          { offset: offset(s2), color: '#fff', textShadow: clear },
          { offset: 1, transform: 'translateY(0)', color: '#fff', textShadow: clear },
        ]);
      });
    } else if (labelRef.current) {
      labelRef.current.textContent = 'ExamPulse';
    }

    let raf = 0;
    const tick = () => {
      if (anims[0] && barRef.current) {
        const t = Number(anims[0].currentTime || 0) % LOOP;
        barRef.current.style.width = `${(t / LOOP) * 100}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      anims.forEach((a) => a.cancel());
    };
  }, []);

  return (
    <>
      <div className="ep-boot-main">
        <div ref={rootRef} className="ep-boot-stage" role="img" aria-label="ExamPulse yüklənir">
          <div className="ep-boot-mark">
            <div ref={glowRef} className="ep-boot-glow" />
            <div ref={ringRef} className="ep-boot-ring" />
            <svg viewBox="0 0 120 120" width="132" height="132" aria-hidden="true">
              <g ref={cubeRef}>
                <polygon className="ep-boot-face" fill="#f0b429" data-dx="0" data-dy="-46" data-r="-14" points="60,12 101.6,36 60,60 18.4,36" />
                <polygon className="ep-boot-face" fill="#1f6f4a" data-dx="-40" data-dy="26" data-r="10" points="18.4,36 60,60 60,108 18.4,84" />
                <polygon className="ep-boot-face" fill="#3eae72" data-dx="40" data-dy="26" data-r="-10" points="60,60 101.6,36 101.6,84 60,108" />
              </g>
            </svg>
          </div>
          <h1 className="ep-boot-word" aria-label="ExamPulse">
            <span className="ep-boot-letters">
              {[...WORD].map((ch, i) => (
                <span className="ep-boot-clip" key={`${ch}${i}`}>
                  <span
                    className="ep-boot-ch"
                    ref={(node) => {
                      charsRef.current[i] = node;
                    }}
                    aria-hidden="true"
                  >
                    {ch}
                  </span>
                </span>
              ))}
            </span>
          </h1>
        </div>
      </div>
      <div className="ep-boot-dock">
        <div className="ep-boot-bar" aria-hidden="true">
          <i ref={barRef} />
        </div>
        <div ref={labelRef} className="ep-boot-label">Yüklənir</div>
      </div>
    </>
  );
}

export default function AppSplash({ children }) {
  const { loading, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [minDone, setMinDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const bootRedirected = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinDone(true), MIN_SHOW_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const canHide = minDone && !loading;

  useEffect(() => {
    if (!canHide) return undefined;
    setLeaving(true);
    const timer = window.setTimeout(() => setGone(true), 420);
    return () => window.clearTimeout(timer);
  }, [canHide]);

  useEffect(() => {
    if (!gone || bootRedirected.current) return;
    bootRedirected.current = true;
    const real = Boolean(user && !user.practice);
    if (real) return;
    const path = location.pathname;
    const practicePage = path.startsWith('/student') || path.startsWith('/teacher') || path.startsWith('/admin');
    if (practicePage) navigate('/', { replace: true });
  }, [gone, user, location.pathname, navigate]);

  return (
    <>
      {gone ? null : (
        <div className={leaving ? 'ep-boot is-out' : 'ep-boot'} aria-hidden={leaving}>
          <LoadingMark />
        </div>
      )}
      {children}
    </>
  );
}
