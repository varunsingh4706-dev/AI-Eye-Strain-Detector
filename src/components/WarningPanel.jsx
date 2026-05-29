import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const levelStyles = {
  info: {
    container: 'border-cyan-500/20 bg-cyan-950/20',
    iconBg: 'bg-cyan-500/10 text-cyan-400',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    label: 'Info',
  },
  warning: {
    container: 'border-amber-500/25 bg-amber-950/15',
    iconBg: 'bg-amber-500/10 text-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    label: 'Warning',
  },
  critical: {
    container: 'border-rose-500/30 bg-rose-950/20',
    iconBg: 'bg-rose-500/10 text-rose-400',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    label: 'Critical',
  },
};

function WarningItem({ warningLevel = 'info', message, recommendation }) {
  const theme = levelStyles[warningLevel] || levelStyles.info;
  const Icon = warningLevel === 'info' ? Info : AlertTriangle;

  return (
    <div className={`rounded-xl border p-4 ${theme.container}`} role="alert">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg flex-shrink-0 ${theme.iconBg}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-100">{message}</p>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${theme.badge}`}>
              {theme.label}
            </span>
          </div>
          {recommendation && <p className="text-xs text-slate-400 leading-relaxed">{recommendation}</p>}
        </div>
      </div>
    </div>
  );
}

function buildWarnings({ isTooClose, blinkRate, sessionMins }) {
  const warnings = [];
  if (isTooClose) {
    warnings.push({
      warningLevel: 'critical',
      message: 'You are sitting too close to the screen',
      recommendation: 'Lean back to arm\'s length (~50 cm) and recalibrate.',
    });
  }
  if (blinkRate < 6) {
    warnings.push({
      warningLevel: 'critical',
      message: 'Blink rate is critically low',
      recommendation: 'Blink deliberately every few seconds to protect your cornea.',
    });
  } else if (blinkRate < 10) {
    warnings.push({
      warningLevel: 'warning',
      message: 'Blink rate is below healthy range',
      recommendation: 'Target 12–18 blinks per minute during screen work.',
    });
  }
  if (sessionMins >= 20) {
    warnings.push({
      warningLevel: 'warning',
      message: 'Extended session detected',
      recommendation: 'Use the 20-20-20 rule: every 20 min, look 20 feet away for 20 sec.',
    });
  }
  if (!warnings.length) {
    warnings.push({
      warningLevel: 'info',
      message: 'No active warnings',
      recommendation: 'Maintain posture distance and healthy blink rhythm.',
    });
  }
  return warnings;
}

export function WarningPanel({ isTooClose, blinkRate, sessionMins }) {
  const warnings = useMemo(
    () => buildWarnings({ isTooClose, blinkRate, sessionMins }),
    [isTooClose, blinkRate, sessionMins]
  );
  const hasCritical = warnings.some((w) => w.warningLevel === 'critical');

  return (
    <div
      className={`glass p-5 rounded-2xl border h-full flex flex-col ${
        hasCritical ? 'glass-glow-danger border-rose-500/20' : 'border-slate-800/80'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-slate-400" />
          <span>Live Recommendations</span>
        </h4>
        {!hasCritical && warnings[0]?.warningLevel === 'info' && (
          <CheckCircle2 size={16} className="text-cyan-400" />
        )}
      </div>
      <div className="space-y-3 flex-1">
        {warnings.map((w, i) => (
          <WarningItem key={`${w.message}-${i}`} {...w} />
        ))}
      </div>
    </div>
  );
}

export default WarningPanel;
