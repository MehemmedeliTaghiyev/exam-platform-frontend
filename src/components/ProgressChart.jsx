export default function ProgressChart({ points = [], labels = [] }) {
  const w = 560;
  const h = 180;
  const pad = 24;
  const values = points.length ? points : [0];
  const max = Math.max(100, ...values);
  const min = 0;
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const coords = values.map((v, i) => {
    const x = pad + i * (stepX || 0);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full">
      <polyline
        fill="none"
        stroke="#4F46E5"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords.join(' ')}
      />
      {values.map((v, i) => {
        const [x, y] = coords[i].split(',');
        return <circle key={i} cx={x} cy={y} r="4" fill="#4F46E5" />;
      })}
      {labels.map((label, i) => {
        const [x] = coords[i]?.split(',') || [0];
        return (
          <text key={label + i} x={x} y={h - 6} textAnchor="middle" className="fill-gray-400" fontSize="10">
            {label}
          </text>
        );
      })}
    </svg>
  );
}
