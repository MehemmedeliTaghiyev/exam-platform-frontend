export function streakFlameStage(streak) {
  const n = Math.max(0, Number(streak) || 0);
  if (n <= 0) return 1;
  if (n <= 2) return 2;
  if (n <= 6) return 3;
  return 4;
}

function Ember() {
  return (
    <>
      <ellipse cx="32" cy="50" rx="9" ry="4" fill="#c45a12" opacity="0.35" />
      <g className="flame-body">
        <path d="M32 48c-5.5 0-9-7-7.2-14 1.8 1.6 3.6 1.4 4.4-5.2 3.6 7 10.6 7.2 10.6 14.4C39.8 46.4 36 48 32 48z" fill="#d96a18" />
        <ellipse cx="32" cy="42" rx="3.2" ry="5" fill="#ffc56a" />
      </g>
    </>
  );
}

function Candle() {
  return (
    <>
      <ellipse cx="32" cy="52" rx="10" ry="4" fill="#c45a12" opacity="0.28" />
      <g className="flame-body">
        <path
          d="M32 52c-8 0-13-11-10-22 4 3 6 1 7-10 7 12 18 12 17 24 0 6-7 8-14 8z"
          fill="#f08a1a"
        />
        <path d="M32 50c-4.4 0-7-7-5-14 2.4 2 3.6.8 4-6 4.4 8 10.4 8 10 15.6C40.6 48.4 36.4 50 32 50z" fill="#ffb43a" />
        <ellipse cx="32" cy="42" rx="2.6" ry="6" fill="#fff3c4" />
      </g>
    </>
  );
}

function Campfire() {
  return (
    <>
      <ellipse cx="32" cy="54" rx="14" ry="4.5" fill="#ff6a00" opacity="0.28" />
      <g className="flame-body">
        <path d="M18 46c-2-8 2-14 8-16-1 6 4 8 6 2 1 8-2 16-8 18-3 1-6-1-6-4z" fill="#e45a10" />
        <path d="M46 46c2-8-2-14-8-16 1 6-4 8-6 2-1 8 2 16 8 18 3 1 6-1 6-4z" fill="#e45a10" />
        <path
          d="M32 54c-10 0-16-13-12-26 5 4 7 0 8-12 9 14 22 14 20 28 0 7-8 10-16 10z"
          fill="#ff8a14"
        />
        <path d="M32 52c-6 0-9-9-6-18 3 3 4 1 5-8 6 10 14 10 13 20 0 5-5 6-12 6z" fill="#ffc03a" />
        <ellipse cx="32" cy="40" rx="3.4" ry="8" fill="#fff6d2" />
      </g>
    </>
  );
}

function Ash() {
  return (
    <>
      <ellipse cx="32" cy="54" rx="12" ry="4" fill="#6b5b4a" opacity="0.45" />
      <g className="flame-body flame-ash">
        <path d="M24 50c-2-6 2-10 6-8-1 4 3 5 4 0 1 6-2 10-6 11-2 1-4-1-4-3z" fill="#5c5348" />
        <path d="M34 49c0-5 3-9 6-7-1 3 2 4 3-1 0 6-3 10-6 11-2 1-3-1-3-3z" fill="#6a6258" />
      </g>
      <path className="flame-smoke" d="M28 44c0-8 4-10 3-16" stroke="#9aa3ad" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path className="flame-smoke flame-smoke-b" d="M36 46c1-9 5-11 2-18" stroke="#8b949e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  );
}

function Inferno() {
  return (
    <>
      <ellipse cx="32" cy="56" rx="18" ry="5" fill="#ff4d00" opacity="0.38" />
      <circle className="flame-spark" cx="16" cy="22" r="1.6" fill="#ffd36a" />
      <circle className="flame-spark flame-spark-b" cx="48" cy="18" r="1.4" fill="#ffe9a8" />
      <circle className="flame-spark flame-spark-c" cx="38" cy="10" r="1.2" fill="#fff" />
      <g className="flame-body">
        <path d="M12 44c-3-10 3-18 12-20-2 8 6 10 8 2 0 10-6 20-14 22-4 1-7-1-6-4z" fill="#e03800" />
        <path d="M52 44c3-10-3-18-12-20 2 8-6 10-8 2 0 10 6 20 14 22 4 1 7-1 6-4z" fill="#e03800" />
        <path
          d="M32 56c-13 0-20-15-14-30 6 4 8-2 9-16 12 16 28 16 25 32-1 9-10 14-20 14z"
          fill="#ff6a00"
        />
        <path d="M32 54c-8 0-13-12-8-22 4 3 6-1 6-12 8 12 20 12 18 24 0 7-7 10-16 10z" fill="#ffb020" />
        <path d="M32 48c-4.5 0-6.5-8-4-14 2.4 2 3.2 0 3.6-7 4.4 8 10 8 9.2 15.4C40.2 46 36.4 48 32 48z" fill="#fff3b0" />
        <ellipse cx="32" cy="36" rx="3.2" ry="9" fill="#fff" />
      </g>
    </>
  );
}

const FORMS = [Ash, Ember, Candle, Campfire, Inferno];

export default function StreakFlame({ streak = 0, dying = 0, size = 28, className = '' }) {
  const fade = Math.min(1, Math.max(0, Number(dying) || 0));
  const life = 1 - fade;
  const base = streakFlameStage(streak);
  const stage = fade >= 0.94 || (base <= 1 && fade >= 0.78) ? 0 : Math.max(1, Math.round(base - fade * 3));
  const Form = FORMS[stage];
  return (
    <span
      className={`streak-flame ${className}`.trim()}
      data-stage={stage}
      data-dying={fade > 0.08 ? '1' : '0'}
      style={{ width: size, height: size, '--flame-life': life }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <Form />
      </svg>
    </span>
  );
}
