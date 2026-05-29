import React from 'react';

export function MetricCard({ title, value, subtext, icon: Icon, colorClass, status, progress }) {
  // Select color variants based on colorClass prop
  const colorMap = {
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400',
      text: 'text-cyan-400',
      progressBg: 'bg-cyan-500',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.05)]'
    },
    purple: {
      border: 'border-purple-500/20 hover:border-purple-500/40',
      iconBg: 'bg-purple-500/10 text-purple-400',
      text: 'text-purple-400',
      progressBg: 'bg-purple-500',
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.05)]'
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      text: 'text-emerald-400',
      progressBg: 'bg-emerald-500',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.05)]'
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400',
      text: 'text-amber-400',
      progressBg: 'bg-amber-500',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.05)]'
    },
    rose: {
      border: 'border-rose-500/20 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 text-rose-400',
      text: 'text-rose-400',
      progressBg: 'bg-rose-500',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.05)]'
    }
  };

  const currentTheme = colorMap[colorClass] || colorMap.cyan;

  return (
    <div className={`glass relative p-5 rounded-2xl border transition-all duration-300 group hover:-translate-y-0.5 ${currentTheme.border} ${currentTheme.glow}`}>
      
      {/* Top row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${currentTheme.iconBg}`}>
          <Icon size={18} className="stroke-[2]" />
        </div>
      </div>

      {/* Main value display */}
      <div className="flex items-baseline space-x-2">
        <h3 className="text-3xl font-bold tracking-tight text-slate-100 font-mono">
          {value}
        </h3>
        {status && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            status === 'Safe' || status === 'Normal' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
            status === 'Low' || status === 'Close' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {status}
          </span>
        )}
      </div>

      {/* Helper progress bar or subtext */}
      {progress !== undefined ? (
        <div className="mt-4">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${currentTheme.progressBg}`} 
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-500">{subtext}</span>
            <span className="text-xs font-semibold text-slate-400">{Math.round(progress)}%</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 mt-2 font-medium">
          {subtext}
        </p>
      )}
    </div>
  );
}
export default MetricCard;
