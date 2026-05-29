import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  Video, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Timer, 
  Activity, 
  Sparkles, 
  RefreshCw, 
  Play, 
  Pause, 
  Maximize, 
  Crosshair, 
  RotateCcw, 
  Compass, 
  HeartPulse,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';

import { useEyeStrain } from './hooks/useEyeStrain';
import MetricCard from './components/MetricCard';
import WarningPanel from './components/WarningPanel';
import AnalyticsCharts from './components/AnalyticsCharts';
import CameraFeed from './components/CameraFeed';

export function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Custom hook containing MediaPipe state machine
  const {
    isTracking,
    isLoading,
    error,
    blinkCount,
    blinkRate,
    isTooClose,
    strainScore,
    calibrate,
    toggleTracking,
    resetSession,
    audioMuted,
    setAudioMuted,
    faceWidth,
    baselineFaceWidth,
    faceDetected,
    faceSearching,
  } = useEyeStrain(videoRef, canvasRef);

  const [sessionSecs, setSessionSecs] = useState(0);
  const [history, setHistory] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const metricsRef = useRef({ strainScore: 0, blinkRate: 0 });

  useEffect(() => {
    metricsRef.current = { strainScore, blinkRate };
  }, [strainScore, blinkRate]);

  useEffect(() => {
    let timer;
    if (isTracking && !isLoading && !error) {
      timer = setInterval(() => setSessionSecs((s) => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isTracking, isLoading, error]);

  useEffect(() => {
    if (!isTracking || isLoading || error) return;
    const logger = setInterval(() => {
      const { strainScore: strain, blinkRate: blinks } = metricsRef.current;
      const timeStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const point = { time: timeStr, strain, blinks: Math.min(blinks, 40) };
      setHistory((prev) => {
        const updated = [...prev, point].slice(-15);
        console.log('[AuraShield] chart updated', { point, samples: updated.length });
        return updated;
      });
    }, 5000);
    return () => clearInterval(logger);
  }, [isTracking, isLoading, error]);

  // Format seconds to MM:SS
  const formatSessionTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Safe calibration action with UI feedback
  const handleCalibrate = () => {
    const success = calibrate();
    if (success) {
      triggerToast("Calibrated standard distance! 🛡️");
    } else {
      triggerToast("Failed to calibrate. Make sure your face is visible.");
    }
  };

  // Full reset wrapper
  const handleReset = () => {
    resetSession();
    setSessionSecs(0);
    setHistory([]);
    triggerToast("Session reset successfully.");
  };

  // Display transient feedback alerts
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Determine strain visual status
  const getStrainStatus = () => {
    if (strainScore < 30) return 'Safe';
    if (strainScore < 60) return 'Moderate';
    return 'Critical';
  };

  const getStrainColor = () => {
    if (strainScore < 30) return 'cyan';
    if (strainScore < 60) return 'amber';
    return 'rose';
  };

  const getBlinkStatus = () => {
    if (blinkRate < 6) return 'Critical';
    if (blinkRate < 10) return 'Low';
    return 'Normal';
  };

  const getBlinkBgColor = () => {
    if (blinkRate < 6) return 'rose';
    if (blinkRate < 10) return 'amber';
    return 'purple';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-200">
      
      {/* 1. Header Navbar */}
      <header className="glass border-b border-slate-900 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Eye size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-md font-bold tracking-tight text-slate-100">AuraShield</span>
                <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  AI Guard
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">In-Browser Ergonomic Diagnostics</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Audio Mute toggle */}
            <button
              onClick={() => setAudioMuted(!audioMuted)}
              title={audioMuted ? "Unmute sound alerts" : "Mute sound alerts"}
              className={`p-2.5 rounded-xl border transition-all duration-300 ${
                audioMuted 
                  ? 'border-slate-800/60 bg-slate-900/40 text-slate-500 hover:text-slate-400' 
                  : 'border-cyan-500/15 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-950/30'
              }`}
            >
              {audioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            {/* Run state controller */}
            <button
              onClick={toggleTracking}
              disabled={isLoading || !!error}
              className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border font-semibold text-xs transition-all duration-300 ${
                !isTracking
                  ? 'bg-cyan-500 border-cyan-400 text-slate-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700'
              }`}
            >
              {isTracking ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
              <span>{isTracking ? 'Pause Guard' : 'Resume Guard'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Page Grid */}
      <main className="max-w-[1400px] w-full mx-auto p-6 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Side: Sidebar Info & Quick Configs */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Quick calibration status card */}
          <div className="glass p-5 rounded-2xl border border-slate-800/80">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              Calibrate Posture
            </h4>
            
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Sit comfortably at your normal working distance (arm's length) and click calibrate to establish your baseline depth.
              </p>
              
              {/* Display calibration metrics */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-900 text-xs font-mono space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Depth:</span>
                  <span className="text-slate-300">{Math.round(faceWidth * 1000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Baseline Depth:</span>
                  <span className="text-slate-300">{Math.round(baselineFaceWidth * 1000)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-900/50 mt-1">
                  <span className="text-slate-500">Status:</span>
                  <span className={`font-semibold ${isTooClose ? 'text-rose-400' : 'text-cyan-400'}`}>
                    {isTooClose ? 'Leaning Close' : 'Optimal'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCalibrate}
                  disabled={!isTracking || !faceDetected}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <Crosshair size={14} />
                  <span>Calibrate</span>
                </button>
                
                <button
                  onClick={handleReset}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-950/50 transition-all"
                  title="Reset Session Stats"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Guidelines Box */}
          <div className="glass p-5 rounded-2xl border border-slate-800/80">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4 flex items-center space-x-1.5">
              <HelpCircle size={14} className="text-slate-400" />
              <span>Ergonomic Reference</span>
            </h4>
            
            <div className="space-y-3.5 text-xs text-slate-400 leading-relaxed">
              <div className="flex items-start space-x-2">
                <div className="h-5 w-5 rounded bg-cyan-950 text-cyan-400 flex items-center justify-center flex-shrink-0 font-mono mt-0.5">20</div>
                <div>
                  <span className="font-semibold text-slate-300">20-20-20 Rule:</span> Every 20 minutes, look at an object 20 feet away for 20 seconds.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="h-5 w-5 rounded bg-purple-950 text-purple-400 flex items-center justify-center flex-shrink-0 font-mono mt-0.5">B</div>
                <div>
                  <span className="font-semibold text-slate-300">Blink Rates:</span> Standard is 12-18 bpm. Screen focus drops this to &lt;6 bpm causing dry corneas.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="h-5 w-5 rounded bg-emerald-950 text-emerald-400 flex items-center justify-center flex-shrink-0 font-mono mt-0.5">D</div>
                <div>
                  <span className="font-semibold text-slate-300">Posture Distance:</span> Eye strain increases exponentially under 50cm screen spacing.
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Center / Right Side: Live Feed & Dashboard Statistics */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Top row: Video Stream (left) and KPI metric grids (right) */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            {/* Webcam container */}
            <div className="md:col-span-2 flex justify-center">
              <CameraFeed
                videoRef={videoRef}
                canvasRef={canvasRef}
                isTracking={isTracking}
                isLoading={isLoading}
                error={error}
                isTooClose={isTooClose}
                faceDetected={faceDetected}
                faceSearching={faceSearching}
              />
            </div>

            {/* Metrics cards grid */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Strain Level Score */}
              <MetricCard
                title="Eye Strain Index"
                value={`${strainScore}%`}
                subtext="Calculated live strain level"
                icon={HeartPulse}
                colorClass={getStrainColor()}
                status={getStrainStatus()}
                progress={strainScore}
              />

              {/* Blink Rate Indicator */}
              <MetricCard
                title="Blink Rate"
                value={`${blinkRate} bpm`}
                subtext={`Total Session Blinks: ${blinkCount}`}
                icon={Activity}
                colorClass={getBlinkBgColor()}
                status={getBlinkStatus()}
              />

              {/* Screen Posture Distance */}
              <MetricCard
                title="Posture Distance"
                value={isTooClose ? 'Too Close' : 'Optimal'}
                subtext="Target distance &gt;50cm"
                icon={Compass}
                colorClass={isTooClose ? 'rose' : 'cyan'}
                status={isTooClose ? 'Close' : 'Safe'}
              />

              {/* Session Duration timer */}
              <MetricCard
                title="Session Duration"
                value={formatSessionTime(sessionSecs)}
                subtext="Time since session began"
                icon={Timer}
                colorClass={sessionSecs >= 1200 ? 'amber' : 'emerald'}
                status={sessionSecs >= 1200 ? 'Needs Break' : 'Healthy'}
              />

            </div>

          </div>

          {/* Bottom row: Analytics trends and Warning notifications panel */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            
            {/* Visual Charts */}
            <div className="xl:col-span-3">
              <AnalyticsCharts history={history} />
            </div>

            {/* Recommendations Warning list */}
            <div className="xl:col-span-2">
              <WarningPanel
                isTooClose={isTooClose}
                blinkRate={blinkRate}
                sessionMins={sessionSecs / 60}
              />
            </div>

          </div>

        </div>

      </main>

      {/* 3. Footer */}
      <footer className="border-t border-slate-900/60 bg-slate-950 py-6 px-6 text-center text-xs text-slate-600">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-mono flex items-center space-x-1.5">
            <Sparkles size={12} className="text-cyan-400" />
            <span>Built using React, Tailwind & MediaPipe Face Mesh. Run client-side.</span>
          </span>
          <span>© 2026 AuraShield Web App. Made for Optical Ergonomic Awareness.</span>
        </div>
      </footer>

      {/* Dynamic Toast Feedback Overlay */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 bg-slate-900 border border-cyan-500/20 text-slate-100 text-xs px-4 py-3 rounded-xl shadow-xl shadow-black/40 animate-slide-in">
          <CheckCircle2 size={16} className="text-cyan-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
export default App;
