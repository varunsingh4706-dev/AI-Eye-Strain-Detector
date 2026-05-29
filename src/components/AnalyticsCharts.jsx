import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(51, 65, 85, 0.8)',
  borderRadius: '12px',
  fontSize: '12px',
  color: '#e2e8f0',
};

export function AnalyticsCharts({ history = [] }) {
  const hasData = history.length > 0;

  return (
    <div className="glass p-5 rounded-2xl border border-slate-800/80 h-full min-h-[280px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-slate-400" />
          <span>Session Analytics</span>
        </h4>
        <span className="text-[10px] text-slate-600 font-mono">
          {hasData ? `${history.length} samples` : 'Awaiting data'}
        </span>
      </div>

      <div className="flex-1 w-full min-h-[220px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.4)" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(51, 65, 85, 0.6)' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="strain"
                domain={[0, 100]}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <YAxis
                yAxisId="blinks"
                orientation="right"
                domain={[0, 40]}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Line
                yAxisId="strain"
                type="monotone"
                dataKey="strain"
                name="Strain %"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                isAnimationActive
                animationDuration={400}
              />
              <Line
                yAxisId="blinks"
                type="monotone"
                dataKey="blinks"
                name="Blink rate"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                isAnimationActive
                animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40">
            <TrendingUp size={28} className="text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-400">No trend data yet</p>
            <p className="text-xs text-slate-600 mt-1 max-w-[240px]">
              Resume guard with your face in frame — metrics log every 5 seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsCharts;
