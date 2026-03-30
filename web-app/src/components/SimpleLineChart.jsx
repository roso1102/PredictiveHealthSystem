import React, { useMemo } from 'react';

export default function SimpleLineChart({ data, title, color = '#00685f' }) {
  const points = useMemo(() => {
    if (!data || data.length < 2) return '';
    const values = data.map((d) => parseInt(String(d.value).split('/')[0], 10));
    const minVal = Math.min(...values) - 5;
    const maxVal = Math.max(...values) + 5;
    const height = 100;
    return data
      .map((d, i) => {
        const y = height - ((parseInt(String(d.value).split('/')[0], 10) - minVal) / (maxVal - minVal)) * height;
        const x = (i / (data.length - 1)) * 300;
        return `${x},${y}`;
      })
      .join(' ');
  }, [data]);

  if (!data || data.length === 0) {
    return <div className="text-center text-on-surface-variant text-sm py-10">No trend data available</div>;
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-on-surface-variant">{title}</h4>
      <svg viewBox="0 0 300 100" className="w-full h-auto">
        {points && <polyline fill="none" stroke={color} strokeWidth="2" points={points} />}
        {points &&
          data.map((d, i) => {
            const point = points.split(' ')[i];
            if (!point) return null;
            const y = point.split(',')[1];
            const x = (i / (data.length - 1)) * 300;
            return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
          })}
      </svg>
      <div className="flex justify-between text-xs text-on-surface-variant mt-1">
        {data.map((d) => (
          <span key={d.date}>{d.date}</span>
        ))}
      </div>
    </div>
  );
}
