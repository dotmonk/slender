import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement,
  Tooltip, Filler,
  type ChartData,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useApp } from '../../context/AppContext';
import Card from '../ui/Card';
import { todayStr, addDays, shortDate, buildDateRangeFromTo } from '../../utils/dates';
import { getWeightForDate, getCaloriesForDate, sumCalories, deriveTargetRange } from '../../utils/calculations';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler);

// ── Types ─────────────────────────────────────────────────────────────────────

type RangeDays = 7 | 30 | 90 | 'all';

interface Props {
  chartDays:    RangeDays;
  setChartDays: (n: RangeDays) => void;
}

const RANGES: { label: string; value: RangeDays }[] = [
  { label: '7 days',   value: 7   },
  { label: '30 days',  value: 30  },
  { label: '90 days',  value: 90  },
  { label: 'All time', value: 'all' },
];

// ── Chart colours ─────────────────────────────────────────────────────────────

function useChartColors(theme: string) {
  const dark = theme === 'dark';
  return {
    line:   dark ? '#ffffff' : '#000000',
    fill:   dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
    bar:    dark ? '#888888' : '#555555',
    barHov: dark ? '#aaaaaa' : '#333333',
    grid:   dark ? '#2a2a2a' : '#eeeeee',
    tick:   dark ? '#666666' : '#999999',
    ttBg:   dark ? '#1e1e1e' : '#ffffff',
    ttFg:   dark ? '#f0f0f0' : '#111111',
    ttBd:   dark ? '#333333' : '#dddddd',
    target: dark ? '#555555' : '#cccccc',
  };
}

function baseOptions(c: ReturnType<typeof useChartColors>) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 as number },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: c.ttBg,
        titleColor: c.ttFg,
        bodyColor:  c.ttFg,
        borderColor: c.ttBd,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid:  { color: c.grid },
        ticks: { color: c.tick, font: { size: 11 }, maxRotation: 0, maxTicksLimit: 8 },
      },
      y: {
        grid:  { color: c.grid },
        ticks: { color: c.tick, font: { size: 11 } },
      },
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEarliestDate(weightDates: string[], calDates: string[]): string | null {
  const all = [...weightDates, ...calDates].filter(Boolean);
  if (!all.length) return null;
  return all.slice().sort()[0];
}

function fmtRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: start.slice(0,4) !== end.slice(0,4) ? 'numeric' : undefined });
  const e = new Date(end   + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${s} – ${e}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Charts({ chartDays, setChartDays }: Props) {
  const { data } = useApp();
  const c = useChartColors(data.settings.theme);

  // Offset: 0 = window ends today, 1 = window ends yesterday, etc.
  const [offset, setOffset] = useState(0);

  const today = todayStr();

  // Earliest data point across both logs
  const earliestDate = getEarliestDate(
    data.weightLog.map((w) => w.date),
    data.calLog.map((e) => e.datetime.slice(0, 10)),
  );

  // Resolve the date window
  let dates: string[];
  let windowStart: string;
  let windowEnd: string;

  if (chartDays === 'all') {
    windowStart = earliestDate ?? today;
    windowEnd   = today;
    dates       = buildDateRangeFromTo(windowStart, windowEnd);
  } else {
    windowEnd   = addDays(today, -offset);
    windowStart = addDays(windowEnd, -(chartDays - 1));
    dates       = buildDateRangeFromTo(windowStart, windowEnd);
  }

  // Navigation bounds
  const canGoRight = chartDays !== 'all' && offset > 0;
  const canGoLeft  = chartDays !== 'all' && (
    earliestDate ? windowStart > earliestDate : true
  );

  function shiftLeft()  { setOffset((o) => o + (chartDays as number)); }
  function shiftRight() { setOffset((o) => Math.max(0, o - (chartDays as number))); }

  // Reset offset when changing range
  function handleRangeChange(v: RangeDays) {
    setChartDays(v);
    setOffset(0);
  }

  const range      = deriveTargetRange(data);
  const isMaintain = data.settings.planType === 'maintain';

  const labels  = dates.map(shortDate);
  const weights = dates.map((d) => getWeightForDate(data.weightLog, d)?.weight ?? null);
  const cals    = dates.map((d) => sumCalories(getCaloriesForDate(data.calLog, d)));

  // ── Weight chart ────────────────────────────────────────────────────────────

  const weightData = {
    labels,
    datasets: [{
      data: weights,
      borderColor: c.line,
      backgroundColor: c.fill,
      borderWidth: 2,
      pointRadius: dates.length > 60 ? 2 : 4,
      pointBackgroundColor: c.line,
      pointHoverRadius: 6,
      fill: true,
      tension: 0.3,
      spanGaps: true,
    }],
  };

  const weightOpts = {
    ...baseOptions(c),
    spanGaps: true,
    plugins: {
      ...baseOptions(c).plugins,
      tooltip: {
        ...baseOptions(c).plugins.tooltip,
        callbacks: { label: (ctx: { parsed: { y: number | null } }) => ctx.parsed.y != null ? `${ctx.parsed.y} kg` : 'No data' },
      },
    },
    scales: {
      ...baseOptions(c).scales,
      y: { ...baseOptions(c).scales.y, ticks: { ...baseOptions(c).scales.y.ticks, callback: (v: number | string) => `${v} kg` } },
    },
  };

  // ── Calorie chart ────────────────────────────────────────────────────────────

  // Determine reference lines to draw
  const refLines: { value: number; color: string; dash: number[] }[] = [];
  if (range) {
    if (isMaintain) {
      refLines.push({ value: range.max, color: c.target, dash: [4, 4] });
    } else {
      refLines.push({ value: range.min, color: c.target, dash: [6, 3] });
      refLines.push({ value: range.max, color: c.target, dash: [4, 4] });
    }
  }

  const calBarDataset = {
    data: cals,
    backgroundColor: cals.map((v) => {
      if (!range) return c.bar;
      if (isMaintain) return v > range.max * 1.05 ? c.barHov : c.bar;
      return (v < range.min || v > range.max) ? c.barHov : c.bar;
    }),
    hoverBackgroundColor: c.barHov,
    borderRadius: dates.length > 60 ? 2 : 4,
    borderSkipped: false as const,
  };

  const calData: ChartData<'bar'> = {
    labels,
    datasets: [
      calBarDataset,
      ...refLines.map((r) => ({
        type: 'line' as const,
        data: dates.map(() => r.value),
        borderColor: r.color,
        borderWidth: 1.5,
        borderDash: r.dash,
        pointRadius: 0,
        fill: false,
      })),
    ] as ChartData<'bar'>['datasets'],
  };

  const calOpts = {
    ...baseOptions(c),
    plugins: {
      ...baseOptions(c).plugins,
      tooltip: {
        ...baseOptions(c).plugins.tooltip,
        callbacks: { label: (ctx: { parsed: { y: number } }) => `${ctx.parsed.y} kcal` },
      },
    },
  };

  // ── Calorie reference line legend text ───────────────────────────────────────
  function calLegend() {
    if (!range) return null;
    if (isMaintain) return `Dashed line = ${range.max} kcal target`;
    return `Lines = ${range.min} kcal (lower) and ${range.max} kcal (upper) window`;
  }

  return (
    <div className="section">
      <h2 style={{ marginBottom: 14 }}>Charts</h2>

      {/* Range tabs */}
      <div className="range-tabs">
        {RANGES.map(({ label, value }) => (
          <button
            key={value}
            className={`range-tab${chartDays === value ? ' active' : ''}`}
            onClick={() => handleRangeChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Window navigator (hidden for All time) */}
      {chartDays !== 'all' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14, padding: '8px 12px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
        }}>
          <button
            className="btn-icon"
            aria-label="Earlier"
            disabled={!canGoLeft}
            style={{ opacity: canGoLeft ? 1 : 0.3 }}
            onClick={shiftLeft}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6"/>
            </svg>
          </button>
          <span style={{ fontSize: '.85rem', fontWeight: 600, letterSpacing: '-.01em' }}>
            {fmtRange(windowStart, windowEnd)}
          </span>
          <button
            className="btn-icon"
            aria-label="Later"
            disabled={!canGoRight}
            style={{ opacity: canGoRight ? 1 : 0.3 }}
            onClick={shiftRight}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </button>
        </div>
      )}

      {chartDays === 'all' && dates.length > 1 && (
        <div style={{ fontSize: '.82rem', color: 'var(--text3)', marginBottom: 14 }}>
          {fmtRange(windowStart, windowEnd)}
        </div>
      )}

      <Card title="Weight (kg)">
        <div className="chart-container">
          <Line data={weightData} options={weightOpts as object} />
        </div>
      </Card>

      <Card title="Calories consumed">
        <div className="chart-container">
          <Bar data={calData} options={calOpts as object} />
        </div>
        {calLegend() && (
          <div style={{ fontSize: '.78rem', color: 'var(--text3)', marginTop: 6 }}>
            {calLegend()}
          </div>
        )}
      </Card>
    </div>
  );
}
