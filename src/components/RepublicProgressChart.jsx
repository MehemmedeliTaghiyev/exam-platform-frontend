import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { republicMonthKey, republicQuestionCount } from '../lib/republicExam';

const MONTH_FULL = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
const MONTH_SHORT = ['YAN', 'FEV', 'MAR', 'APR', 'MAY', 'İYN', 'İYL', 'AVQ', 'SEN', 'OKT', 'NOY', 'DEK'];

function monthParts(key) {
  const [y, m] = String(key || '').split('-').map(Number);
  const index = Math.max(0, (m || 1) - 1);
  return { year: y, index, short: MONTH_SHORT[index], full: MONTH_FULL[index] };
}

function addMonth(key, delta) {
  const [y, m] = String(key).split('-').map(Number);
  const date = new Date(y, (m || 1) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function daysUntilMonthEnd(key) {
  const [y, m] = String(key).split('-').map(Number);
  const end = new Date(y, m, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((end.getTime() - now.getTime()) / 86400000));
}

function buildSeries(history = []) {
  const byMonth = new Map();
  [...history]
    .sort((a, b) => String(a.month).localeCompare(String(b.month)) || String(a.at).localeCompare(String(b.at)))
    .forEach((row) => {
      byMonth.set(row.month, {
        month: row.month,
        percent: Math.max(0, Math.min(100, Number(row.percent) || 0)),
        correct: row.correct,
        total: row.total ?? republicQuestionCount(row.month),
      });
    });

  const taken = [...byMonth.values()].slice(-4);
  const current = republicMonthKey();
  const hasCurrent = byMonth.has(current);
  const upcoming = hasCurrent ? addMonth(current, 1) : current;

  const slots = taken.map((row) => ({ ...row, upcoming: false }));
  if (!slots.some((row) => row.month === upcoming)) {
    slots.push({ month: upcoming, upcoming: true, percent: null });
  }
  return slots;
}

function Chart({ slots, onOpen }) {
  const taken = slots.filter((row) => !row.upcoming);
  const w = 640;
  const h = 210;
  const padL = 48;
  const padR = slots.some((row) => row.upcoming) ? 96 : 20;
  const padT = 28;
  const padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const yTicks = [0, 25, 50, 75, 100];
  const yOf = (value) => padT + (1 - value / 100) * innerH;
  const xOf = (index) => {
    if (slots.length < 2) return padL + innerW / 2;
    return padL + (index / (slots.length - 1)) * innerW;
  };
  const coords = taken.map((row) => {
    const index = slots.findIndex((slot) => slot.month === row.month);
    return { ...row, x: xOf(index), y: yOf(row.percent) };
  });
  const line = coords.map((p) => `${p.x},${p.y}`).join(' ');
  const area = coords.length
    ? `M ${coords[0].x} ${yOf(0)} L ${line.replace(/ /g, ' L ')} L ${coords[coords.length - 1].x} ${yOf(0)} Z`
    : '';
  const uid = 'rp-grad';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="rp-svg" role="img" aria-label="Respublika nəticə qrafiki">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c47a28" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c47a28" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={padL} x2={w - padR + 8} y1={yOf(tick)} y2={yOf(tick)} className="rp-grid" />
          <text x={padL - 10} y={yOf(tick) + 5} textAnchor="end" className="rp-axis">{tick}%</text>
        </g>
      ))}
      {coords.length > 1 && area ? <path d={area} fill={`url(#${uid})`} /> : null}
      {coords.length > 1 ? (
        <polyline className="rp-line" fill="none" points={line} />
      ) : null}
      {coords.map((point, index) => {
        const lastDot = index === coords.length - 1;
        return (
          <g
            key={point.month}
            className="rp-hit"
            onClick={() => onOpen(point.month)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onOpen(point.month); }}
          >
            <circle cx={point.x} cy={point.y} r={lastDot ? 16 : 12} fill="transparent" />
            <circle
              cx={point.x}
              cy={point.y}
              r={lastDot ? 8 : 5}
              className={lastDot ? 'rp-dot is-on' : 'rp-dot'}
            />
            <text
              x={point.x + (lastDot ? 18 : 0)}
              y={point.y - (lastDot ? 2 : 14)}
              textAnchor={lastDot ? 'start' : 'middle'}
              className={lastDot ? 'rp-pct is-on' : 'rp-pct'}
            >
              {point.percent}%
            </text>
          </g>
        );
      })}
      {slots.map((slot, index) => (
        <text key={`x-${slot.month}`} x={xOf(index)} y={h - 8} textAnchor="middle" className="rp-axis">
          {monthParts(slot.month).short}
        </text>
      ))}
    </svg>
  );
}

export default function RepublicProgressChart({ history = [], onRegister, registerLabel }) {
  const navigate = useNavigate();
  const slots = useMemo(() => buildSeries(history), [history]);
  const taken = slots.filter((row) => !row.upcoming);
  const last = taken[taken.length - 1] || null;
  const next = slots.find((row) => row.upcoming) || null;
  const daysLeft = next ? daysUntilMonthEnd(next.month) : 0;
  const lastMonth = last ? monthParts(last.month) : null;
  const nextMonth = next ? monthParts(next.month) : null;

  const open = (month) => {
    if (!month) return;
    navigate(`/student/republic/result/${encodeURIComponent(month)}`);
  };

  return (
    <section className="rp-card card-vector">
      <div className="rp-top">
        <span>Respublika sınağı</span>
        <span>Hər ay</span>
      </div>

      {last ? (
        <button type="button" className="rp-score" onClick={() => open(last.month)}>
          <b>{last.percent}%</b>
          <span>
            <strong>{last.correct ?? '—'} / {last.total ?? '—'}</strong>
            {lastMonth ? `${lastMonth.full} nəticəsi` : ''}
          </span>
        </button>
      ) : (
        <div className="rp-score is-empty">
          <b>—</b>
          <span>Hələ respublika nəticəniz yoxdur</span>
        </div>
      )}

      <div className="rp-plot">
        <Chart slots={slots} onOpen={open} />
        {next ? (
          <aside className="rp-soon">
            <b>{daysLeft}</b>
            <span>gün qalıb</span>
          </aside>
        ) : null}
      </div>

      {nextMonth ? (
        <button type="button" className="rp-register" onClick={onRegister}>
          {registerLabel || `${nextMonth.full} imtahanına qeydiyyatdan keç`}
        </button>
      ) : null}
    </section>
  );
}
