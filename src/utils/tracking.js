/**
 * AuraShield tracking utilities
 */

export function getDistance2D(p1, p2) {
  if (!p1 || !p2) return 0;
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

export function hasUsableLandmarks(landmarks) {
  if (!landmarks) return false;
  const left = landmarks[33];
  const right = landmarks[263];
  return (
    left &&
    right &&
    Number.isFinite(left.x) &&
    Number.isFinite(left.y) &&
    Number.isFinite(right.x) &&
    Number.isFinite(right.y)
  );
}

export function calculateEyeEAR(landmarks, topIdx, bottomIdx, leftIdx, rightIdx) {
  if (!landmarks) return 0.3;
  const top = landmarks[topIdx];
  const bottom = landmarks[bottomIdx];
  const left = landmarks[leftIdx];
  const right = landmarks[rightIdx];
  const verticalDist = getDistance2D(top, bottom);
  const horizontalDist = getDistance2D(left, right);
  if (horizontalDist === 0) return 0.3;
  return verticalDist / horizontalDist;
}

export function calculateAverageEAR(landmarks) {
  if (!hasUsableLandmarks(landmarks)) return 0.3;
  const leftEAR = calculateEyeEAR(landmarks, 159, 145, 33, 133);
  const rightEAR = calculateEyeEAR(landmarks, 386, 374, 362, 263);
  return (leftEAR + rightEAR) / 2;
}

export function calculateFaceWidth(landmarks) {
  if (!hasUsableLandmarks(landmarks)) return 0.1;
  return getDistance2D(landmarks[33], landmarks[263]);
}

export class RollingAverage {
  constructor(size = 16) {
    this.size = size;
    this.values = [];
  }
  push(value) {
    if (!Number.isFinite(value)) return this.get();
    this.values.push(value);
    if (this.values.length > this.size) this.values.shift();
    return this.get();
  }
  get() {
    if (!this.values.length) return 0;
    return this.values.reduce((a, b) => a + b, 0) / this.values.length;
  }
  reset() {
    this.values = [];
  }
}

export class EARSmoother {
  constructor(alpha = 0.35) {
    this.alpha = alpha;
    this.value = null;
  }
  push(v) {
    this.value = this.value === null ? v : this.alpha * v + (1 - this.alpha) * this.value;
    return this.value;
  }
  reset() {
    this.value = null;
  }
}

export class BlinkDetector {
  constructor() {
    this.closedFrames = 0;
    this.openFrames = 0;
    this.eyesClosed = false;
    this.lastBlinkAt = 0;
  }
  update(ear, now = Date.now()) {
    let blink = false;
    if (ear < 0.21) {
      this.closedFrames += 1;
      this.openFrames = 0;
      if (this.closedFrames >= 2) this.eyesClosed = true;
    } else if (ear > 0.24) {
      this.openFrames += 1;
      this.closedFrames = 0;
      if (this.eyesClosed && this.openFrames >= 1 && now - this.lastBlinkAt > 200) {
        this.eyesClosed = false;
        this.lastBlinkAt = now;
        blink = true;
      }
    }
    return { blink };
  }
  reset() {
    this.closedFrames = 0;
    this.openFrames = 0;
    this.eyesClosed = false;
    this.lastBlinkAt = 0;
  }
}

export class FacePresenceSmoother {
  constructor(confirm = 2, lose = 10) {
    this.confirm = confirm;
    this.lose = lose;
    this.hits = 0;
    this.misses = 0;
    this.present = false;
  }
  update(valid) {
    if (valid) {
      this.hits += 1;
      this.misses = 0;
      if (!this.present && this.hits >= this.confirm) this.present = true;
    } else {
      this.misses += 1;
      this.hits = 0;
      if (this.present && this.misses >= this.lose) this.present = false;
    }
    return {
      present: this.present,
      grace: !valid && this.present && this.misses < this.lose,
      searching: !this.present && this.hits > 0,
    };
  }
  reset() {
    this.hits = 0;
    this.misses = 0;
    this.present = false;
  }
}

export function blendBaseline(current, sample, factor = 0.02) {
  if (!Number.isFinite(sample) || sample < 0.01) return current;
  return current * (1 - factor) + sample * factor;
}

export function calculateEyeStrainScore(sessionMins, isTooClose, blinkRate) {
  let score = Math.min(sessionMins * 2, 40);
  if (isTooClose) score += 30;
  if (blinkRate < 6) score += 30;
  else if (blinkRate < 10) score += 15;
  return Math.min(Math.round(score), 100);
}
