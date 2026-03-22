type ChartPoint = number | null;

export interface MiniSeries {
  label: string;
  data: ChartPoint[];
  color: string;
  dashed?: boolean;
}

interface MiniMultiLineChartProps {
  title: string;
  labels: string[];
  series: MiniSeries[];
  height?: number;
}

function toPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
}

export default function MiniMultiLineChart({
  title,
  labels,
  series,
  height = 220,
}: MiniMultiLineChartProps) {
  const width = 840;
  const padding = { top: 20, right: 20, bottom: 38, left: 36 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const values = series.flatMap((line) => line.data).filter((v): v is number => v !== null);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 1;
  const range = max === min ? 1 : max - min;
  const safeLabels = labels.length > 0 ? labels : ["N/A"];

  const xFor = (index: number): number =>
    padding.left + (plotW * index) / Math.max(1, safeLabels.length - 1);
  const yFor = (value: number): number => padding.top + plotH - ((value - min) / range) * plotH;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 text-sm font-semibold text-slate-800">{title}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <rect
          x={padding.left}
          y={padding.top}
          width={plotW}
          height={plotH}
          fill="#f8fafc"
          stroke="#e2e8f0"
        />
        {[0, 1, 2, 3, 4].map((tick) => {
          const ratio = tick / 4;
          const value = max - ratio * range;
          const y = padding.top + ratio * plotH;
          return (
            <g key={`tick-${tick}`}>
              <line x1={padding.left} x2={padding.left + plotW} y1={y} y2={y} stroke="#e2e8f0" />
              <text x={4} y={y + 4} fontSize="10" fill="#64748b">
                {value.toFixed(1)}
              </text>
            </g>
          );
        })}

        {series.map((line) => {
          const segments: Array<Array<{ x: number; y: number }>> = [];
          let segment: Array<{ x: number; y: number }> = [];

          line.data.forEach((value, index) => {
            if (value === null) {
              if (segment.length > 1) segments.push(segment);
              segment = [];
              return;
            }
            segment.push({ x: xFor(index), y: yFor(value) });
          });
          if (segment.length > 1) segments.push(segment);

          return (
            <g key={line.label}>
              {segments.map((points, index) => (
                <path
                  key={`${line.label}-${index}`}
                  d={toPath(points)}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={2}
                  strokeDasharray={line.dashed ? "6 5" : undefined}
                />
              ))}
            </g>
          );
        })}

        {safeLabels.map((label, index) => {
          if (safeLabels.length > 10 && index % Math.ceil(safeLabels.length / 10) !== 0) return null;
          return (
            <text key={label} x={xFor(index) - 12} y={height - 10} fontSize="9" fill="#64748b">
              {label.slice(2)}
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-700">
        {series.map((line) => (
          <div key={line.label} className="flex items-center gap-1">
            <span
              className="inline-block h-0.5 w-4"
              style={{
                backgroundColor: line.color,
                borderBottom: line.dashed ? `1px dashed ${line.color}` : undefined,
              }}
            />
            {line.label}
          </div>
        ))}
      </div>
    </div>
  );
}
