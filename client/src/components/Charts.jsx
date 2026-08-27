import React from 'react';

/**
 * Donut Chart - SVG ring chart for showing ratios
 * @param {Array} segments - [{ value, color, label }]
 * @param {number} size - diameter in px
 * @param {string} centerLabel - text in center
 * @param {string} centerValue - big number in center
 */
export function DonutChart({ segments = [], size = 160, centerLabel = '', centerValue = '' }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return <div className="text-xs text-slate-400 text-center py-4">ไม่มีข้อมูล</div>;

  const radius = (size - 20) / 2;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {/* Segments */}
          {segments.map((seg, i) => {
            const pct = seg.value / total;
            const dashLength = pct * circumference;
            const dashOffset = -(accumulated / total) * circumference;
            accumulated += seg.value;
            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            );
          })}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold text-slate-900">{centerValue}</span>
          {centerLabel && <span className="text-[10px] text-slate-500">{centerLabel}</span>}
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />
            <span className="text-slate-600">{seg.label}</span>
            <span className="font-bold text-slate-800">{seg.value.toLocaleString()}฿</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Horizontal Bar Chart - for category spending breakdown
 * @param {Array} items - [{ label, value, color, icon }]
 * @param {number} maxValue - max bar width reference
 */
export function HorizontalBarChart({ items = [], maxValue = null }) {
  const max = maxValue || Math.max(...items.map(i => i.value), 1);

  if (items.length === 0) {
    return <div className="text-xs text-slate-400 text-center py-4">ไม่มีข้อมูล</div>;
  }

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const pct = Math.round((item.value / max) * 100);
        return (
          <div key={i} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs">
                {item.icon && <span>{item.icon}</span>}
                <span className="font-medium text-slate-700">{item.label}</span>
              </div>
              <span className="text-xs font-bold text-slate-900">{item.value.toLocaleString()}฿</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, background: item.color || '#10b981' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Mini Sparkline - simple line chart for trends
 * @param {Array} data - [number, number, ...]
 * @param {string} color
 * @param {number} width
 * @param {number} height
 */
/**
 * Vertical Bar Chart - for monthly comparison
 * @param {Array} items - [{ label, value, color, icon }]
 * @param {number} maxValue - max bar height reference
 */
export function VerticalBarChart({ items = [], maxValue = null }) {
  const max = maxValue || Math.max(...items.map(i => i.value), 1);
  const barWidth = Math.min(60, Math.max(30, 400 / items.length));
  const chartHeight = 160;

  if (items.length === 0) {
    return <div className="text-xs text-slate-400 text-center py-4">ไม่มีข้อมูล</div>;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-end gap-2" style={{ height: chartHeight }}>
        {items.map((item, i) => {
          const height = max > 0 ? Math.round((item.value / max) * (chartHeight - 30)) : 0;
          return (
            <div key={i} className="flex flex-col items-center gap-1 group">
              <span className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition">
                {item.value.toLocaleString()}฿
              </span>
              <div
                className="rounded-t-lg transition-all duration-700 ease-out hover:opacity-80 cursor-pointer"
                style={{
                  width: barWidth,
                  height: Math.max(height, 4),
                  background: item.color || '#10b981',
                }}
              />
              <span className="text-[10px] font-medium text-slate-600 whitespace-nowrap">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Sparkline({ data = [], color = '#10b981', width = 200, height = 40 }) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padding = 4;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * w;
    const y = padding + h - ((val - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${padding + h} ${points} ${padding + w},${padding + h}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkline-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#sparkline-${color.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {data.length > 0 && (() => {
        const lastX = padding + w;
        const lastY = padding + h - ((data[data.length - 1] - min) / range) * h;
        return <circle cx={lastX} cy={lastY} r="3" fill={color} />;
      })()}
    </svg>
  );
}
