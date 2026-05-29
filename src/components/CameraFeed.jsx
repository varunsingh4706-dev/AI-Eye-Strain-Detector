import React from 'react';
import { Camera, CameraOff, Loader2 } from 'lucide-react';

function faceBadgeLabel(isTracking, faceDetected, faceSearching) {
  if (!isTracking) return { text: 'Paused', dot: 'bg-slate-500', ping: false };
  if (faceDetected) return { text: 'Face Locked', dot: 'bg-emerald-500', ping: true };
  if (faceSearching) return { text: 'Searching', dot: 'bg-amber-500', ping: false };
  return { text: 'No Face', dot: 'bg-rose-500', ping: false };
}

export function CameraFeed({
  videoRef,
  canvasRef,
  isTracking,
  isLoading,
  error,
  isTooClose,
  faceDetected = false,
  faceSearching = false,
}) {
  const badge = faceBadgeLabel(isTracking, faceDetected, faceSearching);
  return (
    <div className={`glass relative rounded-2xl border overflow-hidden flex flex-col items-center justify-center aspect-[4/3] w-full max-w-[500px] mx-auto transition-all duration-300 ${
      isTooClose 
        ? 'border-rose-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)] ring-2 ring-rose-500/20' 
        : 'border-slate-800/80 hover:border-slate-700/80 shadow-md'
    }`}>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-20 space-y-3">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Initializing MediaPipe Face Mesh...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-20 space-y-4">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-400">
            <CameraOff size={32} />
          </div>
          <div>
            <h5 className="text-md font-semibold text-slate-200">Camera Unavailable</h5>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Stopped / Paused overlay */}
      {!isLoading && !isTracking && !error && (
        <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-20 space-y-3">
          <div className="p-3 rounded-full bg-slate-800/50 text-slate-400">
            <CameraOff size={24} />
          </div>
          <p className="text-xs text-slate-400 font-medium">Tracking is paused</p>
        </div>
      )}

      {/* Video & Canvas container */}
      <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
        {/* Hidden or scaled video feed */}
        <video
          ref={videoRef}
          className="absolute w-full h-full object-cover scale-x-[-1] opacity-40 pointer-events-none"
          playsInline
          muted
          autoPlay
          width={640}
          height={480}
        />

        {/* Overlay Canvas drawing the glowing points */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full object-cover z-10"
          width={640}
          height={480}
        />
        
        {/* Floating state badge */}
        {!isLoading && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800">
            <span className={`h-2 w-2 rounded-full ${badge.dot} ${badge.ping ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-300">
              {badge.text}
            </span>
          </div>
        )}
        {!isLoading && !error && (
          <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800">
            <div className={`h-2 w-2 rounded-full ${
              isTooClose ? 'bg-rose-500 animate-pulse' : isTracking ? 'bg-cyan-500 animate-pulse' : 'bg-slate-500'
            }`} />
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-300">
              {isTooClose ? 'Too Close!' : isTracking ? 'Live Feed' : 'Paused'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
export default CameraFeed;
