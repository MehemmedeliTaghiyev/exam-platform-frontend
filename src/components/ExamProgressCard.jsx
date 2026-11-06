import { useMemo, useState } from 'react';
import { shortProgressDate } from '../lib/examProgress';

function Chart({ rows, selectedId }) {
  const w = 560;
  const h = 168;
  const padX = 22;
  const padTop = 16;
  const padBot = 28;
  const values = rows.map((row) => row.percent);
  const max = Math.max(100, ...values, 1);
  const step = values.length > 1 ? (w - padX * 2) / (values.length - 1) : 0;
  const coords = values.map((value, index) => {
    const x = padX + index * (step || 0);
    const y = padTop + (1 - value / max) * (h - padTop - padBot);
    return { x, y, value };
  });
  const line = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const area = coords.length
    ? `M ${coords[0].x} ${h - padBot} L ${line.replace(/ /g, ' L ')} L ${coords[coords.length - 1].x} ${h - padBot} Z`
    : '';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="exam-progress-chart" aria-hidden="true">
      {coords.length > 1 && area ? <path d={area} className="exam-progress-fill" /> : null}
      {coords.length > 1 ? (
        <polyline className="exam-progress-line" fill="none" points={line} />
      ) : null}
      {rows.map((row, index) => {
        const point = coords[index];
        const on = String(row.id) === String(selectedId);
        return (
          <g key={row.id}>
            <circle
              cx={point.x}
              cy={point.y}
              r={on ? 7 : 4.5}
              className={on ? 'exam-progress-dot is-on' : 'exam-progress-dot'}
            />
            <text x={point.x} y={h - 8} textAnchor="middle" className="exam-progress-axis">
              {row.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ExamProgressCard({
  rows = [],
  selectedId,
  onSelect,
  emptyText = 'Hələ sınaq nəticəsi yoxdur.',
}) {
  const [localId, setLocalId] = useState('');
  const lastId = rows.length ? String(rows[rows.length - 1].id) : '';
  const currentId = selectedId != null ? String(selectedId) : (localId || lastId);
  const selected = useMemo(
    () => rows.find((row) => String(row.id) === currentId) || rows[rows.length - 1] || null,
    [rows, currentId],
  );

  const pick = (id) => {
    if (onSelect) onSelect(id);
    else setLocalId(String(id));
  };

  if (!rows.length || !selected) {
    return (
      <article className="exam-progress">
        <p className="exam-progress-empty">{emptyText}</p>
      </article>
    );
  }

  const delta = selected.delta || 0;

  return (
    <article className="exam-progress">
      <div className="exam-progress-head">
        <p className="exam-progress-kicker">
          {selected.title} · {selected.subject}
          {selected.at ? ` · ${shortProgressDate(selected.at)}` : ''}
        </p>
        <div className="exam-progress-scoreline">
          <p className="exam-progress-score">
            {selected.percent} <span>/ 100</span>
          </p>
          {rows.length > 1 && selected !== rows[0] ? (
            <p className={`exam-progress-delta ${delta >= 0 ? 'is-up' : 'is-down'}`}>
              {delta >= 0 ? '▲' : '▼'} {delta >= 0 ? '+' : ''}{delta} əvvəlki sınaqdan
            </p>
          ) : (
            <p className="exam-progress-delta is-muted">İlk sınaq</p>
          )}
        </div>
      </div>

      <Chart rows={rows} selectedId={selected.id} />

      <div className="exam-progress-list">
        <p className="exam-progress-list-title">Əvvəlki sınaqlar</p>
        {rows.map((row) => {
          const on = String(row.id) === String(selected.id);
          const strong = row.percent >= 70;
          return (
            <button
              key={row.id}
              type="button"
              className={`exam-progress-row ${on ? 'is-on' : ''}`}
              onClick={() => pick(row.id)}
            >
              <span className="exam-progress-row-top">
                <span>{row.title}</span>
                <b>{row.percent}%</b>
              </span>
              <span className="exam-progress-bar">
                <i style={{ width: `${Math.max(4, Math.min(100, row.percent))}%` }} className={strong ? 'is-strong' : 'is-weak'} />
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
