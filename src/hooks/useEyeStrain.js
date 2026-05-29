import { useState, useEffect, useRef, useCallback } from 'react';
import {
  calculateAverageEAR,
  calculateFaceWidth,
  calculateEyeStrainScore,
  hasUsableLandmarks,
  RollingAverage,
  EARSmoother,
  BlinkDetector,
  FacePresenceSmoother,
  blendBaseline,
} from '../utils/tracking';

const MP_OPTIONS = {
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.25,
  minTrackingConfidence: 0.25,
};

async function waitForVideo(video, timeoutMs = 8000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (video?.readyState >= 2 && video.videoWidth > 0) {
        resolve(video);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Video stream timeout'));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

async function attachWebcamStream(video, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i += 1) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      video.srcObject = stream;
      await waitForVideo(video);
      try {
        await video.play();
      } catch {
        /* autoplay may need gesture */
      }
      console.log('[AuraShield] stream attached', {
        width: video.videoWidth,
        height: video.videoHeight,
        attempt: i + 1,
      });
      return stream;
    } catch (err) {
      lastErr = err;
      console.warn('[AuraShield] getUserMedia retry', i + 1, err.message);
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  throw lastErr || new Error('Camera permission denied or unavailable');
}

export function useEyeStrain(videoRef, canvasRef) {
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blinkCount, setBlinkCount] = useState(0);
  const [blinkRate, setBlinkRate] = useState(0);
  const [isTooClose, setIsTooClose] = useState(false);
  const [strainScore, setStrainScore] = useState(0);
  const [faceWidth, setFaceWidth] = useState(0.1);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceSearching, setFaceSearching] = useState(false);
  const [baselineFaceWidth, setBaselineFaceWidth] = useState(() => {
    const saved = localStorage.getItem('aura_baseline_face_width');
    return saved ? parseFloat(saved) : 0.12;
  });
  const [audioMuted, setAudioMuted] = useState(true);

  const blinkTimestampsRef = useRef([]);
  const sessionStartRef = useRef(Date.now());
  const activeSessionRef = useRef(true);
  const baselineRef = useRef(baselineFaceWidth);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const depthAvgRef = useRef(new RollingAverage(16));
  const earSmootherRef = useRef(new EARSmoother(0.32));
  const blinkDetectorRef = useRef(new BlinkDetector());
  const facePresenceRef = useRef(new FacePresenceSmoother(2, 10));
  const lastLandmarksRef = useRef(null);
  const faceDetectedRef = useRef(false);
  const tooCloseRef = useRef(false);
  const optimalStreakRef = useRef(0);
  const sendInFlightRef = useRef(false);
  const debugLogRef = useRef(0);
  const pipelineRef = useRef({});

  useEffect(() => {
    baselineRef.current = baselineFaceWidth;
  }, [baselineFaceWidth]);

  useEffect(() => {
    activeSessionRef.current = isTracking;
  }, [isTracking]);

  const calibrate = useCallback(() => {
    const stabilized = depthAvgRef.current.get() || faceWidth;
    console.log('[AuraShield] baseline saved', {
      stabilized,
      previous: baselineRef.current,
      faceDetected: faceDetectedRef.current,
    });
    if (stabilized > 0.01) {
      baselineRef.current = stabilized;
      setBaselineFaceWidth(stabilized);
      localStorage.setItem('aura_baseline_face_width', String(stabilized));
      return true;
    }
    return false;
  }, [faceWidth]);

  const toggleTracking = useCallback(() => {
    const next = !activeSessionRef.current;
    activeSessionRef.current = next;
    setIsTracking(next);
    if (next) sessionStartRef.current = Date.now();
  }, []);

  const resetSession = useCallback(() => {
    setBlinkCount(0);
    setBlinkRate(0);
    setStrainScore(0);
    setIsTooClose(false);
    tooCloseRef.current = false;
    blinkTimestampsRef.current = [];
    blinkDetectorRef.current.reset();
    earSmootherRef.current.reset();
    depthAvgRef.current.reset();
    facePresenceRef.current.reset();
    lastLandmarksRef.current = null;
    faceDetectedRef.current = false;
    setFaceDetected(false);
    setFaceSearching(false);
    optimalStreakRef.current = 0;
    sessionStartRef.current = Date.now();
  }, []);

  const drawWireframe = useCallback((landmarks, ctx, w, h, tooClose) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = tooClose ? 'rgba(239,68,68,0.08)' : 'rgba(6,182,212,0.04)';
    ctx.fillRect(0, 0, w, h);
    const main = tooClose ? 'rgba(239,68,68,0.65)' : 'rgba(6,182,212,0.55)';
    const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
    const leftEye = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
    const rightEye = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
    const drawPath = (indices, color) => {
      ctx.beginPath();
      indices.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        const x = (1 - pt.x) * w;
        const y = pt.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.stroke();
    };
    drawPath(faceOval, main);
    drawPath(leftEye, 'rgba(168,85,247,0.8)');
    drawPath(rightEye, 'rgba(168,85,247,0.8)');
  }, []);

  const processLandmarks = useCallback((landmarks, ctx, w, h) => {
    const stabilized = depthAvgRef.current.push(calculateFaceWidth(landmarks));
    setFaceWidth(stabilized);

    const ratio = stabilized / baselineRef.current;
    const tooClose = ratio > 1.25;
    tooCloseRef.current = tooClose;
    setIsTooClose(tooClose);

    if (!tooClose) {
      optimalStreakRef.current += 1;
      if (optimalStreakRef.current > 40) {
        const next = blendBaseline(baselineRef.current, stabilized, 0.015);
        if (Math.abs(next - baselineRef.current) > 0.0001) {
          baselineRef.current = next;
          setBaselineFaceWidth(next);
          localStorage.setItem('aura_baseline_face_width', String(next));
        }
      }
    } else {
      optimalStreakRef.current = 0;
    }

    drawWireframe(landmarks, ctx, w, h, tooClose);

    const ear = earSmootherRef.current.push(calculateAverageEAR(landmarks));
    const { blink } = blinkDetectorRef.current.update(ear);
    if (blink) {
      blinkTimestampsRef.current.push(Date.now());
      setBlinkCount((c) => {
        const n = c + 1;
        console.log('[AuraShield] blink detected', { count: n, ear: ear.toFixed(3) });
        return n;
      });
    }
  }, [drawWireframe]);

  pipelineRef.current = { processLandmarks, drawWireframe };

  useEffect(() => {
    let alive = true;

    const init = async () => {
      try {
        setError(null);
        setIsLoading(true);
        console.log('[AuraShield] webcam initializing');

        if (!window.FaceMesh) {
          for (let i = 0; i < 20 && alive; i += 1) {
            if (window.FaceMesh) break;
            await new Promise((r) => setTimeout(r, 300));
          }
        }
        if (!window.FaceMesh) {
          throw new Error('MediaPipe FaceMesh failed to load. Check network connection.');
        }

        let video = videoRef.current;
        for (let i = 0; i < 20 && !video && alive; i += 1) {
          await new Promise((r) => setTimeout(r, 50));
          video = videoRef.current;
        }
        if (!video) throw new Error('Video element not ready');

        mediaStreamRef.current = await attachWebcamStream(video);
        console.log('[AuraShield] webcam initialized');

        const faceMesh = new window.FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions(MP_OPTIONS);

        faceMesh.onResults((results) => {
          if (!alive) return;
          const canvas = canvasRef.current;
          const vid = videoRef.current;
          if (!canvas || !vid) return;

          const ctx = canvas.getContext('2d');
          const w = canvas.width;
          const h = canvas.height;
          const raw = results.multiFaceLandmarks?.[0] ?? null;
          const valid = hasUsableLandmarks(raw);
          const presence = facePresenceRef.current.update(valid);

          const now = Date.now();
          if (now - debugLogRef.current > 2000) {
            debugLogRef.current = now;
            console.log('[AuraShield] landmarks detected', {
              valid,
              present: presence.present,
              hits: facePresenceRef.current.hits,
              misses: facePresenceRef.current.misses,
              faceConfidence: valid ? 0.9 : 0,
            });
          }

          if (faceDetectedRef.current !== presence.present) {
            faceDetectedRef.current = presence.present;
            setFaceDetected(presence.present);
            console.log('[AuraShield] face state', presence.present ? 'LOCKED' : 'NO FACE');
          }
          setFaceSearching(presence.searching);

          const landmarks = valid ? raw : presence.grace ? lastLandmarksRef.current : null;
          if (landmarks) {
            lastLandmarksRef.current = landmarks;
            if (activeSessionRef.current) {
              pipelineRef.current.processLandmarks(landmarks, ctx, w, h);
            } else {
              pipelineRef.current.drawWireframe(landmarks, ctx, w, h, tooCloseRef.current);
            }
            return;
          }

          if (!presence.present && facePresenceRef.current.misses >= 10) {
            ctx.clearRect(0, 0, w, h);
            lastLandmarksRef.current = null;
          }
        });

        faceMeshRef.current = faceMesh;

        let rafId = 0;
        const frameLoop = async () => {
          if (!alive) return;
          const v = videoRef.current;
          if (faceMeshRef.current && v?.srcObject && v.readyState >= 2 && !sendInFlightRef.current) {
            sendInFlightRef.current = true;
            try {
              await faceMeshRef.current.send({ image: v });
            } catch (e) {
              console.warn('[AuraShield] frame send error', e);
            } finally {
              sendInFlightRef.current = false;
            }
          }
          rafId = requestAnimationFrame(frameLoop);
        };
        cameraRef.current = { stop: () => cancelAnimationFrame(rafId) };
        rafId = requestAnimationFrame(frameLoop);

        activeSessionRef.current = true;
        setIsLoading(false);
        setIsTracking(true);
        setError(null);
        console.log('[AuraShield] tracking pipeline ready');
      } catch (err) {
        console.error('[AuraShield] init failed', err);
        if (alive) {
          const msg =
            err.name === 'NotAllowedError'
              ? 'Camera permission denied. Allow camera access and reload.'
              : err.message || 'Camera initialization failed';
          setError(msg);
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      alive = false;
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
        } catch {
          /* ignore */
        }
        cameraRef.current = null;
      }
      if (faceMeshRef.current) {
        try {
          faceMeshRef.current.close();
        } catch {
          /* ignore */
        }
        faceMeshRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [videoRef, canvasRef]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!activeSessionRef.current) return;
      const now = Date.now();
      const elapsedMins = (now - sessionStartRef.current) / 60000;
      const cutoff = now - 60000;
      blinkTimestampsRef.current = blinkTimestampsRef.current.filter((t) => t > cutoff);

      let rate = blinkTimestampsRef.current.length;
      const elapsedSec = (now - sessionStartRef.current) / 1000;
      if (elapsedMins < 1 && elapsedSec > 8) {
        rate = Math.round((blinkTimestampsRef.current.length / elapsedSec) * 60);
      }
      setBlinkRate(rate);
      setStrainScore(calculateEyeStrainScore(elapsedMins, tooCloseRef.current, rate));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return {
    isTracking,
    isLoading,
    error,
    blinkCount,
    blinkRate,
    isTooClose,
    strainScore,
    faceDetected,
    faceSearching,
    calibrate,
    toggleTracking,
    resetSession,
    audioMuted,
    setAudioMuted,
    faceWidth,
    baselineFaceWidth,
  };
}
