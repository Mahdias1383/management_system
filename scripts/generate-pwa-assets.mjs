#!/usr/bin/env node
/**
 * RailPulse Enterprise — High-Resolution PWA Icons & Adaptive Splash Screen Generator
 *
 * Deterministically renders anti-aliased, high-DPI PNG icon sets (72px through 1024px,
 * standard "any", Android/iOS "maskable" with 15% safe-zone padding, and "monochrome")
 * plus adaptive portrait/landscape/tablet splash screens (dark & light themes)
 * into `public/icons/`.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ICONS_DIR = path.resolve(__dirname, '../public/icons');

// Ensure output directory exists
fs.mkdirSync(ICONS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// 1. Minimal High-Speed PNG Encoder (CRC32 + Zlib Deflate, RGBA 8-bit)
// ---------------------------------------------------------------------------
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePngRGBA(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Prepend filter byte 0 (None) to each scanline
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const destOffset = y * (rowBytes + 1);
    rawData[destOffset] = 0;
    rgbaBuffer.copy(rawData, destOffset + 1, y * rowBytes, (y + 1) * rowBytes);
  }

  const compressed = zlib.deflateSync(rawData, { level: 6 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// 2. Signed-Distance-Field (SDF) Anti-Aliased Vector Drawing Primitives
// ---------------------------------------------------------------------------
function clamp(val, min, max) {
  return val < min ? min : val > max ? max : val;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function sdRoundedBox(px, py, cx, cy, halfW, halfH, r) {
  const qx = Math.abs(px - cx) - (halfW - r);
  const qy = Math.abs(py - cy) - (halfH - r);
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    r
  );
}

function blendPixel(buf, idx, r, g, b, alpha) {
  if (alpha <= 0) return;
  const a = clamp(alpha, 0, 1);
  const invA = 1 - a;
  const dstA = buf[idx + 3] / 255;
  const outA = a + dstA * invA;
  if (outA <= 0) return;
  buf[idx] = Math.round((r * a + buf[idx] * dstA * invA) / outA);
  buf[idx + 1] = Math.round((g * a + buf[idx + 1] * dstA * invA) / outA);
  buf[idx + 2] = Math.round((b * a + buf[idx + 2] * dstA * invA) / outA);
  buf[idx + 3] = Math.round(outA * 255);
}

/**
 * Renders the RailPulse emblem inside a normalized coordinate box [cx, cy, size]
 * onto an RGBA buffer.
 */
function drawRailPulseEmblem(buf, width, height, cx, cy, size, options = {}) {
  const {
    maskable = false,
    monochrome = false,
    drawSquirclePlate = true,
  } = options;

  // For maskable icons, scale artwork to 76% inside the central safe zone
  const contentScale = maskable ? 0.76 : 0.92;
  const half = size / 2;
  const minX = Math.max(0, Math.floor(cx - half - 2));
  const maxX = Math.min(width - 1, Math.ceil(cx + half + 2));
  const minY = Math.max(0, Math.floor(cy - half - 2));
  const maxY = Math.min(height - 1, Math.ceil(cy + half + 2));

  // Pulse wave polyline in normalized [-1, 1] emblem coordinates
  const pulsePoints = [
    [-0.58, 0.08],
    [-0.31, 0.08],
    [-0.21, -0.06],
    [-0.10, 0.21],
    [0.0, -0.02],
    [0.10, 0.21],
    [0.21, -0.06],
    [0.31, 0.08],
    [0.58, 0.08],
  ];

  // Track segments in normalized coordinates
  const trackSegments = [
    [-0.38, 0.72, -0.09, 0.14],
    [0.38, 0.72, 0.09, 0.14],
    [-0.31, 0.60, 0.31, 0.60],
    [-0.22, 0.44, 0.22, 0.44],
    [-0.14, 0.29, 0.14, 0.29],
  ];

  const aa = 2.0 / size;

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const idx = (py * width + px) * 4;
      // Normalized [-1, 1] relative to emblem box
      const nxRaw = (px - cx) / half;
      const nyRaw = (py - cy) / half;

      // 1. Optional squircle emblem background plate
      if (drawSquirclePlate) {
        const dPlate = sdRoundedBox(nxRaw, nyRaw, 0, 0, 0.96, 0.96, maskable ? 0.0 : 0.42);
        if (dPlate > aa) continue;
        const plateAlpha = maskable ? 1 : clamp(0.5 - dPlate / (2 * aa), 0, 1);

        if (!monochrome) {
          const tGrad = clamp((nxRaw + nyRaw + 2) / 4, 0, 1);
          const bgR = Math.round(lerp(9, 15, tGrad));
          const bgG = Math.round(lerp(13, 35, tGrad));
          const bgB = Math.round(lerp(22, 72, tGrad));
          blendPixel(buf, idx, bgR, bgG, bgB, plateAlpha);

          // Subtle inner border ring
          const dRing = Math.abs(sdRoundedBox(nxRaw, nyRaw, 0, 0, 0.89, 0.89, maskable ? 0.36 : 0.38));
          if (dRing < aa * 2.2) {
            const ringAlpha = clamp(1 - dRing / (aa * 2.2), 0, 1) * 0.28;
            blendPixel(buf, idx, 56, 189, 248, ringAlpha);
          }
        }
      }

      // Scale coordinates into safe zone for inner train & pulse iconography
      const nx = nxRaw / contentScale;
      const ny = nyRaw / contentScale;
      if (Math.abs(nx) > 0.95 || Math.abs(ny) > 0.95) continue;

      // 2. Converging perspective tracks
      for (let s = 0; s < trackSegments.length; s++) {
        const [x1, y1, x2, y2] = trackSegments[s];
        const dTrack = distToSegment(nx, ny, x1, y1, x2, y2);
        const strokeW = s < 2 ? 0.022 : 0.018;
        if (dTrack < strokeW + aa) {
          const a = clamp(1 - (dTrack - strokeW) / aa, 0, 1) * (monochrome ? 0.85 : 0.42);
          if (monochrome) {
            blendPixel(buf, idx, 255, 255, 255, a);
          } else {
            blendPixel(buf, idx, 56, 189, 248, a);
          }
        }
      }

      // 3. Aerodynamic High-Speed Bullet Train Body
      // Tapered nose top + rounded cabin base
      const trainCenterY = -0.14;
      const trainHalfH = 0.48;
      const taper = ny < 0 ? 1 - Math.pow(clamp(-ny / 0.65, 0, 1), 1.65) * 0.52 : 1.0;
      const trainHalfW = 0.33 * taper;
      const dTrain = sdRoundedBox(nx, ny, 0, trainCenterY, trainHalfW, trainHalfH, 0.14);

      if (dTrain < aa) {
        const trainA = clamp(0.5 - dTrain / (2 * aa), 0, 1);
        if (monochrome) {
          blendPixel(buf, idx, 255, 255, 255, trainA);
        } else {
          const tTrain = clamp((ny + 0.6) / 1.0, 0, 1);
          const trR = Math.round(lerp(56, 30, tTrain));
          const trG = Math.round(lerp(189, 88, tTrain));
          const trB = Math.round(lerp(248, 215, tTrain));
          blendPixel(buf, idx, trR, trG, trB, trainA);
        }

        // Aerodynamic Cockpit Windshield
        const dWindshield = sdRoundedBox(nx, ny, 0, -0.34, trainHalfW * 0.76, 0.13, 0.07);
        if (dWindshield < aa) {
          const wA = clamp(0.5 - dWindshield / (2 * aa), 0, 1);
          if (monochrome) {
            // Cutout dark window on monochrome
            buf[idx + 3] = Math.round(buf[idx + 3] * (1 - wA * 0.75));
          } else {
            blendPixel(buf, idx, 12, 34, 68, wA * 0.92);
          }
        }

        // Dual High-Beam Headlights
        const dHeadL = Math.hypot(nx + 0.18, ny - 0.18) - 0.045;
        const dHeadR = Math.hypot(nx - 0.18, ny - 0.18) - 0.045;
        const dHead = Math.min(dHeadL, dHeadR);
        if (dHead < aa && !monochrome) {
          const hA = clamp(0.5 - dHead / (2 * aa), 0, 1);
          blendPixel(buf, idx, 240, 249, 255, hA);
        }
      }

      // 4. Digital Telemetry Pulse Waveform
      let minPulseDist = 999;
      for (let i = 0; i < pulsePoints.length - 1; i++) {
        const [x1, y1] = pulsePoints[i];
        const [x2, y2] = pulsePoints[i + 1];
        const d = distToSegment(nx, ny, x1, y1, x2, y2);
        if (d < minPulseDist) minPulseDist = d;
      }

      const pulseRadius = 0.028;
      if (minPulseDist < pulseRadius + aa * 2.5) {
        // Outer glow
        if (!monochrome && minPulseDist >= pulseRadius) {
          const glowA = clamp(1 - (minPulseDist - pulseRadius) / (aa * 2.5), 0, 1) * 0.35;
          blendPixel(buf, idx, 56, 189, 248, glowA);
        }
        // Core pulse stroke
        if (minPulseDist < pulseRadius + aa) {
          const strokeA = clamp(1 - (minPulseDist - pulseRadius) / aa, 0, 1);
          if (monochrome) {
            blendPixel(buf, idx, 255, 255, 255, strokeA);
          } else {
            const tP = clamp((nx + 0.6) / 1.2, 0, 1);
            const pR = Math.round(lerp(16, 56, tP));
            const pG = Math.round(lerp(185, 189, tP));
            const pB = Math.round(lerp(129, 248, tP));
            blendPixel(buf, idx, pR, pG, pB, strokeA);
          }
        }
      }

      // 5. Center Radar Signal Node
      const dNode = Math.hypot(nx, ny + 0.02) - 0.048;
      if (dNode < aa && !monochrome) {
        const nA = clamp(0.5 - dNode / (2 * aa), 0, 1);
        blendPixel(buf, idx, 16, 185, 129, nA);
      }
    }
  }
}

/**
 * Generates an icon PNG of `size x size`.
 */
function renderIconPng(size, options = {}) {
  const { maskable = false, monochrome = false } = options;
  const buf = Buffer.alloc(size * size * 4, 0);

  if (maskable) {
    // Fill full-bleed background so OS mask shapes never clip into transparency
    for (let y = 0; y < size; y++) {
      const ny = y / size;
      for (let x = 0; x < size; x++) {
        const nx = x / size;
        const t = clamp((nx + ny) * 0.5, 0, 1);
        const idx = (y * size + x) * 4;
        buf[idx] = Math.round(lerp(6, 14, t));
        buf[idx + 1] = Math.round(lerp(11, 32, t));
        buf[idx + 2] = Math.round(lerp(22, 68, t));
        buf[idx + 3] = 255;
      }
    }
  }

  drawRailPulseEmblem(buf, size, size, size / 2, size / 2, size, {
    maskable,
    monochrome,
    drawSquirclePlate: !monochrome,
  });

  return encodePngRGBA(size, size, buf);
}

/**
 * Generates an adaptive mobile or tablet splash screen PNG of `width x height`.
 */
function renderSplashScreenPng(width, height, theme = 'dark') {
  const isLight = theme === 'light';
  const buf = Buffer.alloc(width * height * 4, 0);

  const centerX = width / 2;
  const isLandscape = width > height;
  const emblemCenterY = isLandscape ? height * 0.43 : height * 0.41;
  const minDim = Math.min(width, height);
  const emblemSize = Math.round(minDim * (isLandscape ? 0.30 : 0.32));

  // 1. Render smooth ambient background + radial spotlight around emblem
  const glowRadius = minDim * 0.52;
  for (let y = 0; y < height; y++) {
    const ny = y / height;
    const dy = y - emblemCenterY;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - centerX;
      const dist = Math.hypot(dx, dy);
      const glow = clamp(1 - dist / glowRadius, 0, 1);

      if (isLight) {
        const baseR = lerp(248, 226, ny);
        const baseG = lerp(250, 238, ny);
        const baseB = lerp(252, 250, ny);
        buf[idx] = Math.round(lerp(baseR, 214, glow * 0.35));
        buf[idx + 1] = Math.round(lerp(baseG, 238, glow * 0.35));
        buf[idx + 2] = Math.round(lerp(baseB, 254, glow * 0.35));
        buf[idx + 3] = 255;
      } else {
        const baseR = lerp(6, 15, ny);
        const baseG = lerp(11, 23, ny);
        const baseB = lerp(20, 42, ny);
        buf[idx] = Math.round(lerp(baseR, 14, glow * 0.45));
        buf[idx + 1] = Math.round(lerp(baseG, 62, glow * 0.45));
        buf[idx + 2] = Math.round(lerp(baseB, 118, glow * 0.45));
        buf[idx + 3] = 255;
      }
    }
  }

  // 2. Render the centered high-resolution RailPulse Emblem
  drawRailPulseEmblem(buf, width, height, centerX, emblemCenterY, emblemSize, {
    maskable: false,
    monochrome: false,
    drawSquirclePlate: true,
  });

  // 3. Render sleek brand progress bar / accent indicator below the emblem
  const barY = Math.round(emblemCenterY + emblemSize * 0.72);
  const barHalfW = Math.round(emblemSize * 0.42);
  const barHalfH = Math.max(3, Math.round(minDim * 0.0045));

  for (let y = barY - barHalfH - 2; y <= barY + barHalfH + 2; y++) {
    if (y < 0 || y >= height) continue;
    for (let x = Math.round(centerX - barHalfW - 2); x <= Math.round(centerX + barHalfW + 2); x++) {
      if (x < 0 || x >= width) continue;
      const dBar = sdRoundedBox(x, y, centerX, barY, barHalfW, barHalfH, barHalfH);
      if (dBar < 1.5) {
        const a = clamp(0.5 - dBar / 3.0, 0, 1);
        const t = clamp((x - (centerX - barHalfW)) / (barHalfW * 2), 0, 1);
        const r = Math.round(lerp(16, 56, t));
        const g = Math.round(lerp(185, 189, t));
        const b = Math.round(lerp(129, 248, t));
        blendPixel(buf, (y * width + x) * 4, r, g, b, a * 0.9);
      }
    }
  }

  // 4. Render secondary subtle subtitle pill below the accent bar
  const subBarY = Math.round(barY + emblemSize * 0.12);
  const subHalfW = Math.round(emblemSize * 0.26);
  const subHalfH = Math.max(2, Math.round(minDim * 0.003));
  for (let y = subBarY - subHalfH - 2; y <= subBarY + subHalfH + 2; y++) {
    if (y < 0 || y >= height) continue;
    for (let x = Math.round(centerX - subHalfW - 2); x <= Math.round(centerX + subHalfW + 2); x++) {
      if (x < 0 || x >= width) continue;
      const dSub = sdRoundedBox(x, y, centerX, subBarY, subHalfW, subHalfH, subHalfH);
      if (dSub < 1.5) {
        const a = clamp(0.5 - dSub / 3.0, 0, 1) * 0.45;
        if (isLight) {
          blendPixel(buf, (y * width + x) * 4, 71, 85, 105, a);
        } else {
          blendPixel(buf, (y * width + x) * 4, 148, 163, 184, a);
        }
      }
    }
  }

  return encodePngRGBA(width, height, buf);
}

// ---------------------------------------------------------------------------
// 3. Execute Generation Matrix
// ---------------------------------------------------------------------------
const ICON_SPECS = [
  { file: 'icon-72.png', size: 72 },
  { file: 'icon-96.png', size: 96 },
  { file: 'icon-128.png', size: 128 },
  { file: 'icon-144.png', size: 144 },
  { file: 'icon-152.png', size: 152 },
  { file: 'icon-180.png', size: 180 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-384.png', size: 384 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-1024.png', size: 1024 },
  { file: 'icon-maskable-192.png', size: 192, maskable: true },
  { file: 'icon-maskable-384.png', size: 384, maskable: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'icon-maskable-1024.png', size: 1024, maskable: true },
  { file: 'icon-monochrome-512.png', size: 512, monochrome: true },
];

const SPLASH_SPECS = [
  { file: 'splash-portrait-750x1334.png', width: 750, height: 1334, theme: 'dark' },
  { file: 'splash-portrait-1170x2532.png', width: 1170, height: 2532, theme: 'dark' },
  { file: 'splash-portrait-light-1170x2532.png', width: 1170, height: 2532, theme: 'light' },
  { file: 'splash-portrait-1290x2796.png', width: 1290, height: 2796, theme: 'dark' },
  { file: 'splash-landscape-2532x1170.png', width: 2532, height: 1170, theme: 'dark' },
  { file: 'splash-tablet-1668x2388.png', width: 1668, height: 2388, theme: 'dark' },
  { file: 'splash-tablet-landscape-2388x1668.png', width: 2388, height: 1668, theme: 'dark' },
];

console.log('[RailPulse PWA Asset Generator] Rendering high-resolution icons...');
for (const spec of ICON_SPECS) {
  const png = renderIconPng(spec.size, {
    maskable: Boolean(spec.maskable),
    monochrome: Boolean(spec.monochrome),
  });
  const outPath = path.join(ICONS_DIR, spec.file);
  fs.writeFileSync(outPath, png);
  console.log(`  ✓ ${spec.file} (${spec.size}x${spec.size}, ${png.length} bytes)`);
}

console.log('[RailPulse PWA Asset Generator] Rendering adaptive splash screens...');
for (const spec of SPLASH_SPECS) {
  const png = renderSplashScreenPng(spec.width, spec.height, spec.theme);
  const outPath = path.join(ICONS_DIR, spec.file);
  fs.writeFileSync(outPath, png);
  console.log(`  ✓ ${spec.file} (${spec.width}x${spec.height}, ${spec.theme}, ${png.length} bytes)`);
}

console.log('[RailPulse PWA Asset Generator] All PWA icons and splash screens generated successfully.');
