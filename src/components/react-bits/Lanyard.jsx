import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const DIMENSIONS = {
  portrait: [1.6, 2.4],
  landscape: [2.25, 1.6],
};
const ANCHORS = { left: 0.27, center: 0.5, right: 0.73 };
const CARD_DEPTH = 0.018;
const BEVEL = 0.007;
const NUM_SEGMENTS = 4;
const INV_MASS = 20;
const TIME_STEP = 1 / 960;
const SOLVER_ITERS = 2;
const RIBBON_POINTS = 72;
const CAMERA_FOV = 24;
const CLIP_WIDTH = 0.36;
const RING_RADIUS = 0.095;
const RING_TUBE = 0.0135;
const HOOK_RADIUS = 0.036;
const TEX_WIDTH = 1024;

const FINISHES = {
  glossy: { roughness: 0.38, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05, foil: 0.15, anisotropy: 0 },
  matte: { roughness: 0.85, metalness: 0, clearcoat: 0, clearcoatRoughness: 0.6, foil: 0, anisotropy: 0 },
  holographic: { roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, foil: 1, anisotropy: 0 },
  metallic: { roughness: 0.36, metalness: 0.75, clearcoat: 0.5, clearcoatRoughness: 0.18, foil: 0, anisotropy: 0.7 },
};

const RIBBON_U = [0, 0.07, 0.93, 1];
const RIBBON_ANGLES = [-0.95, -0.28, 0.28, 0.95];
const FLIP_IMPULSE = 9;

const METALS = {
  silver: { color: '#d9dce2', roughness: 0.16 },
  gold: { color: '#e4b965', roughness: 0.18 },
  graphite: { color: '#4d4f55', roughness: 0.28 },
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function drawRoundedRectPath(path, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  const c = rad * 0.4477;
  path.moveTo(x + rad, y);
  path.lineTo(x + w - rad, y);
  path.bezierCurveTo(x + w - c, y, x + w, y + c, x + w, y + rad);
  path.lineTo(x + w, y + h - rad);
  path.bezierCurveTo(x + w, y + h - c, x + w - c, y + h, x + w - rad, y);
  // Wait: fix bezier curve top-right / top-left accurately
}

function buildRoundedShape(path, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  const c = rad * 0.4477;
  path.moveTo(x + rad, y);
  path.lineTo(x + w - rad, y);
  path.bezierCurveTo(x + w - c, y, x + w, y + c, x + w, y + rad);
  path.lineTo(x + w, y + h - rad);
  path.bezierCurveTo(x + w, y + h - c, x + w - c, y + h, x + w - rad, y + h);
  path.lineTo(x + rad, y + h);
  path.bezierCurveTo(x + c, y + h, x, y + h - c, x, y + h - rad);
  path.lineTo(x, y + rad);
  path.bezierCurveTo(x, y + c, x + c, y, x + rad, y);
}

function getCardMetrics(orientation, cornerRadius) {
  const [width, height] = DIMENSIONS[orientation] || DIMENSIONS.portrait;
  const radius = lerp(0.03, Math.min(width, height) * 0.2, clamp(cornerRadius, 0, 1));
  const slot = { width: 0.34, height: 0.07, y: height / 2 - 0.13 };
  const ringY = height / 2 - 0.055;
  const hangY = ringY + RING_RADIUS;
  return { width, height, radius, slot, ringY, hangY };
}

function createCardGeometries(metrics) {
  const { width, height, radius, slot } = metrics;
  const shape = new THREE.Shape();
  buildRoundedShape(
    shape,
    -width / 2 + BEVEL,
    -height / 2 + BEVEL,
    width - BEVEL * 2,
    height - BEVEL * 2,
    Math.max(radius - BEVEL, 0.005)
  );
  const hole = new THREE.Path();
  buildRoundedShape(
    hole,
    -slot.width / 2 - BEVEL,
    slot.y - slot.height / 2 - BEVEL,
    slot.width + BEVEL * 2,
    slot.height + BEVEL * 2,
    slot.height / 2 + BEVEL
  );
  shape.holes.push(hole);

  const body = new THREE.ExtrudeGeometry(shape, {
    depth: CARD_DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 5,
    curveSegments: 24,
  });
  body.translate(0, 0, -CARD_DEPTH / 2);

  const face = new THREE.ShapeGeometry(shape, 24);
  const pos = face.getAttribute('position');
  const uv = face.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + width / 2) / width, (pos.getY(i) + height / 2) / height);
  }
  uv.needsUpdate = true;
  return { body, face };
}

function createClipGeometry(strapWidth) {
  const shape = new THREE.Shape();
  const w = strapWidth * 1.16;
  buildRoundedShape(shape, -w / 2 + 0.014, -0.061, w - 0.028, 0.122, 0.024);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 6,
    curveSegments: 10,
  });
  geom.translate(0, 0, -0.01);
  return geom;
}

function createRibbonGeometry(numPoints) {
  const cols = RIBBON_U.length;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(numPoints * cols * 3), 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(numPoints * cols * 3), 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(numPoints * cols * 2), 2));
  const indices = [];
  for (let r = 0; r < numPoints - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const i = r * cols + c;
      indices.push(i, i + cols, i + 1, i + 1, i + cols, i + cols + 1);
    }
  }
  geom.setIndex(indices);
  return geom;
}

function createStudioEnvironment(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.035, 0.02, 0.025);
  const plane = new THREE.PlaneGeometry(1, 1);
  const mats = [];
  const addLightPanel = (intensity, pos, scale, rotZ = 0) => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(intensity, intensity * 0.94, intensity * 0.9),
      side: THREE.DoubleSide,
    });
    mats.push(mat);
    const mesh = new THREE.Mesh(plane, mat);
    mesh.position.set(...pos);
    mesh.scale.set(scale[0], scale[1], 1);
    mesh.lookAt(0, 0, 0);
    mesh.rotateZ(rotZ);
    scene.add(mesh);
  };
  addLightPanel(2.6, [0, 4.5, 8], [9, 4]);
  addLightPanel(6, [-5.5, 0.5, 7], [0.9, 14]);
  addLightPanel(4, [5, -0.5, 8], [0.6, 14]);
  addLightPanel(3.5, [0, -1, 9], [24, 0.35], Math.PI / 3);
  addLightPanel(2.5, [1, 2.5, 9], [24, 0.2], Math.PI / 3);
  addLightPanel(1.4, [0, 6, -6], [12, 4]);
  addLightPanel(0.5, [0, -7, 1], [16, 6]);
  addLightPanel(0.9, [8, 0, -2], [4, 10]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  plane.dispose();
  mats.forEach((m) => m.dispose());
  return envTarget;
}

function drawFrontCardCanvas(canvas, photoImg) {
  const w = 1024;
  const h = 1536;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Editorial cream-gold & dark crimson background matching alfari.my.id frontCard layout
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#f3ebd9');
  bgGrad.addColorStop(0.5, '#e8dcc4');
  bgGrad.addColorStop(1, '#d8c7a8');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle geometric grid lines like frontCard.webp
  ctx.strokeStyle = 'rgba(41, 0, 68, 0.12)';
  ctx.lineWidth = 1.5;
  for (let i = -h; i < w + h; i += 44) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - h * 0.4, h);
    ctx.stroke();
  }
  for (let j = 0; j < h; j += 44) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(w, j + 120);
    ctx.stroke();
  }

  // Top Pill "EXECUTIVE" (in place of "JUNIOR")
  ctx.fillStyle = '#160024';
  ctx.fillRect(114, 54, 250, 68);
  ctx.fillStyle = '#f3ebd9';
  ctx.font = '900 40px "Space Grotesk", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXECUTIVE', 239, 90);

  // Top right emblem + "EJAA THALA / ENTERPRISE"
  ctx.save();
  ctx.translate(710, 88);
  ctx.fillStyle = '#290044';
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a0099';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#c285ff';
  ctx.font = '800 28px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ET', 0, 2);
  ctx.restore();

  ctx.fillStyle = '#11001c';
  ctx.font = '800 28px "Space Grotesk", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('EJAA THALA', 768, 60);
  ctx.fillText('ENTERPRISE', 768, 90);
  ctx.fillText('PORTFOLIO • IDN', 768, 120);

  // Technical bounding box around "DEVELOPER"
  ctx.strokeStyle = '#160024';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 144, w - 96, 232);
  [
    [48, 144],
    [w - 48, 144],
    [48, 376],
    [w - 48, 376],
  ].forEach(([cx, cy]) => {
    ctx.fillStyle = '#160024';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
  });

  // Connect line from EXECUTIVE to DEVELOPER box
  ctx.beginPath();
  ctx.moveTo(364, 88);
  ctx.lineTo(478, 88);
  ctx.lineTo(478, 144);
  ctx.stroke();

  // Giant "DEVELOPER" text
  ctx.fillStyle = '#160024';
  ctx.font = '900 162px "Space Grotesk", Impact, "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DEVELOPER', w / 2, 268);

  // "original" sticker stamp over V/E
  ctx.save();
  ctx.translate(340, 265);
  ctx.rotate(-0.32);
  ctx.fillStyle = '#f3ebd9';
  ctx.strokeStyle = '#160024';
  ctx.lineWidth = 4;
  ctx.fillRect(-58, -28, 116, 56);
  ctx.strokeRect(-58, -28, 116, 56);
  ctx.fillStyle = '#160024';
  ctx.font = '800 22px "Space Grotesk", sans-serif';
  ctx.fillText('original', 0, -10);
  for (let s = -45; s <= 45; s += 18) {
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(s - 8, 24);
    ctx.lineTo(s + 10, 4);
    ctx.stroke();
  }
  ctx.restore();

  // Left backdrop rectangle behind portrait (deep crimson noir texture)
  const backdropGrad = ctx.createLinearGradient(85, 430, 440, 1220);
  backdropGrad.addColorStop(0, '#290044');
  backdropGrad.addColorStop(0.5, '#12001f');
  backdropGrad.addColorStop(1, '#030006');
  ctx.fillStyle = backdropGrad;
  ctx.fillRect(85, 434, 360, 790);

  // Right vertical frame "CREATIVE ARCHITECT" (matching "TEKNIK JARINGAN")
  ctx.strokeStyle = '#160024';
  ctx.lineWidth = 3;
  ctx.strokeRect(755, 432, 224, 845);
  [
    [755, 432],
    [979, 432],
  ].forEach(([cx, cy]) => {
    ctx.fillStyle = '#160024';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.save();
  ctx.translate(868, 860);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#160024';
  ctx.font = '900 84px "Space Grotesk", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WORLD IS YOURS', 0, 0);
  ctx.restore();

  // Center Portrait of Ejaa Thala
  if (photoImg) {
    ctx.save();
    // Draw portrait centered with dramatic shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 16;

    // Rounded portrait frame or full cutout style in center
    const px = 115;
    const py = 330;
    const pw = 680;
    const ph = 970;

    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 22);
    ctx.clip();

    const scale = Math.max(pw / photoImg.width, ph / photoImg.height);
    const dw = photoImg.width * scale;
    const dh = photoImg.height * scale;
    const dx = px + (pw - dw) / 2;
    const dy = py + (ph - dh) * 0.25;
    ctx.drawImage(photoImg, dx, dy, dw, dh);

    // Subtle luxury vignette border on portrait
    ctx.strokeStyle = 'rgba(41, 0, 68, 0.75)';
    ctx.lineWidth = 5;
    ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
    ctx.restore();
  }

  // Name Tape Banner across lower portrait: "EJAA THALA"
  ctx.save();
  ctx.translate(398, 1072);
  ctx.rotate(0.018);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ede3c8';
  ctx.fillRect(-284, -46, 568, 92);
  ctx.strokeStyle = '#290044';
  ctx.lineWidth = 3;
  ctx.strokeRect(-278, -40, 556, 80);
  ctx.fillStyle = '#160024';
  ctx.font = '900 54px "Space Grotesk", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EJAA THALA', 0, 2);
  ctx.restore();

  // Bottom Dark Crimson-Obsidian Footer Bar
  ctx.fillStyle = '#0d0017';
  ctx.fillRect(0, 1296, w, h - 1296);
  ctx.strokeStyle = '#5a0099';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 1296);
  ctx.lineTo(w, 1296);
  ctx.stroke();

  // "PORTFOLIO" text on bottom left
  ctx.fillStyle = '#e5dac3';
  ctx.font = '900 84px "Space Grotesk", Impact, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('PORTFOLIO', 56, 1418);

  // Interlocking rings in bottom middle
  ctx.strokeStyle = 'rgba(229, 218, 195, 0.72)';
  ctx.lineWidth = 2;
  for (let r = 0; r < 8; r++) {
    ctx.beginPath();
    ctx.arc(536 + r * 12, 1418, 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  // "The World / Is Yours" on bottom right
  ctx.fillStyle = '#f3ebd9';
  ctx.font = '400 30px "Inter", sans-serif';
  ctx.fillText('The World', 662, 1400);
  ctx.fillText('is yours.', 662, 1438);
}

function drawBackCardCanvas(canvas) {
  const w = 1024;
  const h = 1536;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Editorial cream background
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#f3ebd9');
  bgGrad.addColorStop(1, '#d8c7a8');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = 'rgba(41, 0, 68, 0.10)';
  ctx.lineWidth = 1.5;
  for (let i = -h; i < w + h; i += 44) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - h * 0.4, h);
    ctx.stroke();
  }

  // Top-left tilted "SCAN HERE" stamp
  ctx.save();
  ctx.translate(235, 155);
  ctx.rotate(-0.14);
  ctx.fillStyle = '#efe5cf';
  ctx.strokeStyle = '#160024';
  ctx.lineWidth = 4;
  ctx.fillRect(-195, -80, 390, 160);
  ctx.strokeRect(-195, -80, 390, 160);
  ctx.fillStyle = '#160024';
  ctx.font = '900 62px "Space Grotesk", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCAN HERE', 0, -24);
  for (let s = -155; s <= 145; s += 60) {
    ctx.beginPath();
    ctx.moveTo(s, 62);
    ctx.lineTo(s + 32, 18);
    ctx.lineTo(s + 58, 18);
    ctx.lineTo(s + 26, 62);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Top right emblem
  ctx.save();
  ctx.translate(550, 155);
  ctx.fillStyle = '#290044';
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a0099';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#c285ff';
  ctx.font = '900 42px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ET', 0, 2);
  ctx.restore();

  ctx.fillStyle = '#160024';
  ctx.font = '900 42px "Space Grotesk", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('EJAA THALA', 635, 118);
  ctx.fillText('ENTERPRISES', 635, 162);
  ctx.fillText('PORTFOLIO • IDN', 635, 206);

  // Center Dark Panel "CONNECT OUR SOSMED" + QR Code
  ctx.fillStyle = '#0d0017';
  ctx.fillRect(90, 286, 718, 900);
  ctx.strokeStyle = '#5a0099';
  ctx.lineWidth = 3;
  ctx.strokeRect(90, 286, 718, 900);

  ctx.fillStyle = '#f3ebd9';
  ctx.font = '900 64px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CONNECT OUR', 480, 400);
  ctx.font = '500 50px "Space Grotesk", sans-serif';
  ctx.fillText('—  INSTAGRAM  —', 480, 465);

  // Full real scannable QR code without middle logo or bottom text
  const qrMatrix = [
    '111111101001000110010100101111111',
    '100000100011100010011100101000001',
    '101110100111011011011101001011101',
    '101110100010110000101011101011101',
    '101110101111110000000111001011101',
    '100000100110000011101111001000001',
    '111111101010101010101010101111111',
    '000000001101100111001110000000000',
    '100111111101010000000010011010001',
    '011011000001010001110101010110101',
    '011000110110000100111000100000001',
    '000011010011101010111100010110010',
    '110110110010100100100000110011010',
    '110011000011111111101001001011010',
    '011000100110010101000100000111000',
    '100101001110101101110000111010110',
    '101110101100100101110110110010010',
    '001111011100000110110101110001111',
    '111000100110010101011011011001111',
    '010110010000110010011111000111001',
    '101001111010011010001001001101101',
    '001111011100000110110011110000111',
    '000111111101101011100101100110101',
    '101001001110101011100111010001011',
    '000001111001111111111110111110011',
    '000000001100011100010111100010111',
    '111111101010101110001001101011111',
    '100000101000011000111110100011100',
    '101110101000101110001000111111100',
    '101110101110111001101000001011010',
    '101110100100000001000000010000100',
    '100000100111001011100111111101000',
    '111111101001000000011001000100001',
  ];
  const cells = qrMatrix.length;
  const cellW = 16;
  const qrInnerSize = cells * cellW;
  const pad = 24;
  const qrBoxSize = qrInnerSize + pad * 2;
  const qrBoxX = 480 - qrBoxSize / 2;
  const qrBoxY = 530;

  // White quiet-zone card for reliable scanning
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
  ctx.fill();

  ctx.fillStyle = '#030006';
  const qrStartX = qrBoxX + pad;
  const qrStartY = qrBoxY + pad;
  for (let r = 0; r < cells; r++) {
    const row = qrMatrix[r];
    for (let c = 0; c < cells; c++) {
      if (row[c] === '1') {
        ctx.fillRect(qrStartX + c * cellW, qrStartY + r * cellW, cellW, cellW);
      }
    }
  }

  // Right vertical bar
  ctx.fillStyle = '#0d0017';
  ctx.fillRect(838, 240, 186, 1050);
  ctx.save();
  ctx.translate(928, 780);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#f3ebd9';
  ctx.font = '900 54px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CREATIVE 3D DEVELOPER', 0, 0);
  ctx.restore();

  // Bottom Name Banner
  ctx.fillStyle = '#0d0017';
  ctx.fillRect(108, 1290, 816, 200);
  ctx.strokeStyle = '#5a0099';
  ctx.lineWidth = 3;
  ctx.strokeRect(108, 1290, 816, 200);

  ctx.fillStyle = '#f3ebd9';
  ctx.font = '900 56px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EJAA THALA', 516, 1368);
  ctx.font = '500 38px "Inter", sans-serif';
  ctx.fillStyle = '#5a0099';
  ctx.fillText('—  Executive Developer  —', 516, 1435);
}

function drawStrapCanvas(canvas) {
  const w = 192;
  const h = 768;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return h / w;

  ctx.fillStyle = '#040008';
  ctx.fillRect(0, 0, w, h);

  // Subtle crimson/gold edge stitching
  ctx.fillStyle = 'rgba(90, 0, 153, 0.45)';
  for (let y = 0; y < h; y += 16) {
    ctx.fillRect(12, y, 3, 9);
    ctx.fillRect(w - 15, y, 3, 9);
  }

  // Vertical brand text along the strap matching bandd.webp
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(Math.PI / 2);

  // Circle icon
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(-230, 0, 44, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 900 52px "Space Grotesk", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('E', -230, 3);

  ctx.font = '900 68px "Space Grotesk", "Arial Black", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Ejaa Thala', -160, 4);
  ctx.restore();

  return h / w;
}

function createPlasticNormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const rng = mulberry32(7);
  const noise = Float32Array.from({ length: 16384 }, () => rng());
  const sample = (x, y) => {
    let sum = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        sum += noise[((y + dy + 128) % 128) * 128 + ((x + dx + 128) % 128)];
      }
    }
    return (sum / 9) * 1.6;
  };
  const img = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const nx = sample((x - 1 + 128) % 128, y) - sample((x + 1) % 128, y);
      const ny = sample(x, (y - 1 + 128) % 128) - sample(x, (y + 1) % 128);
      const len = Math.hypot(nx, ny, 1);
      const idx = (y * 128 + x) * 4;
      img.data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[idx + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 7);
  return tex;
}

function createPhysicsState() {
  const makeVecs = () => Array.from({ length: 5 }, () => new THREE.Vector3());
  return {
    nodes: makeVecs(),
    previous: makeVecs(),
    velocities: makeVecs(),
    lengths: new Float64Array(NUM_SEGMENTS),
    impulses: new Float64Array(NUM_SEGMENTS),
    rest: 1,
    anchor: new THREE.Vector3(),
    body: {
      position: new THREE.Vector3(),
      previous: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      previousQuaternion: new THREE.Quaternion(),
      angular: new THREE.Vector3(),
      mass: 1,
      inverseInertia: new THREE.Vector3(1, 1, 1),
      hang: new THREE.Vector3(),
    },
    grab: null,
    turn: 0,
    twist: 0,
    twistRaw: 0,
    calm: 0,
  };
}

const SCRATCH = {
  a: new THREE.Vector3(),
  b: new THREE.Vector3(),
  c: new THREE.Vector3(),
  d: new THREE.Vector3(),
  e: new THREE.Vector3(),
  f: new THREE.Vector3(),
  g: new THREE.Vector3(),
  pin: new THREE.Vector3(),
  q: new THREE.Quaternion(),
  r: new THREE.Quaternion(),
};

const applyWorldInertia = (body, vec, out) => {
  SCRATCH.r.copy(body.quaternion).invert();
  out.copy(vec).applyQuaternion(SCRATCH.r);
  out.set(
    out.x * body.inverseInertia.x,
    out.y * body.inverseInertia.y,
    out.z * body.inverseInertia.z
  );
  return out.applyQuaternion(body.quaternion);
};

const integrateQuaternion = (q, omegaDt) => {
  const { x, y, z, w } = q;
  q.x += 0.5 * (omegaDt.x * w + omegaDt.y * z - omegaDt.z * y);
  q.y += 0.5 * (omegaDt.y * w + omegaDt.z * x - omegaDt.x * z);
  q.z += 0.5 * (omegaDt.z * w + omegaDt.x * y - omegaDt.y * x);
  q.w += 0.5 * (-omegaDt.x * x - omegaDt.y * y - omegaDt.z * z);
  q.normalize();
};

const effectiveInverseMass = (body, rVec, dir) => {
  const rxn = SCRATCH.c.crossVectors(rVec, dir);
  return 1 / body.mass + rxn.dot(applyWorldInertia(body, rxn, SCRATCH.d));
};

const applyBodyImpulse = (body, rVec, impulse) => {
  body.position.addScaledVector(impulse, 1 / body.mass);
  integrateQuaternion(body.quaternion, applyWorldInertia(body, SCRATCH.e.crossVectors(rVec, impulse), SCRATCH.f));
};

function solveSegment(state, idx, dt, params) {
  const { nodes, body } = state;
  const p0 = nodes[idx];
  const w0 = idx === 0 ? 0 : INV_MASS;
  const isLast = idx === 3;
  const rVec = SCRATCH.g;
  let p1 = nodes[idx + 1];
  if (isLast) {
    rVec.copy(body.hang).applyQuaternion(body.quaternion);
    p1 = SCRATCH.b.copy(body.position).add(rVec);
  }
  const delta = SCRATCH.a.subVectors(p1, p0);
  const dist = delta.length();
  const stretch = dist - state.rest;
  if (stretch <= 0 || dist < 1e-9) return;
  const dir = delta.divideScalar(dist);
  const w1 = isLast ? effectiveInverseMass(body, rVec, dir) : INV_MASS;
  const relVel = (dist - state.lengths[idx]) / dt;
  const maxImpulse =
    (params.hold * Math.tanh((params.stiffness * stretch) / params.hold) +
      params.spring * stretch +
      params.bandDamping * Math.max(0, relVel)) *
      dt *
      dt -
    state.impulses[idx];
  if (maxImpulse <= 0) return;
  const impulse = Math.min(stretch / (w0 + w1), maxImpulse);
  state.impulses[idx] += impulse;
  if (w0) p0.addScaledVector(dir, impulse * w0);
  if (isLast) {
    applyBodyImpulse(body, rVec, dir.multiplyScalar(-impulse));
  } else {
    p1.addScaledVector(dir, -impulse * w1);
  }
}

function solveGrab(body, grab, targetPos) {
  const rVec = SCRATCH.g.copy(grab.local).applyQuaternion(body.quaternion);
  const diff = SCRATCH.a.copy(targetPos).sub(body.position).sub(rVec);
  const dist = diff.length();
  if (dist < 1e-9) return;
  const dir = diff.divideScalar(dist);
  const impulse = dist / effectiveInverseMass(body, rVec, dir);
  applyBodyImpulse(body, rVec, dir.multiplyScalar(impulse));
}

function resetPhysics(state, metrics, withIntro) {
  const { nodes, previous, velocities, body, anchor } = state;
  nodes[0].copy(anchor);
  for (let i = 1; i <= NUM_SEGMENTS; i++) {
    nodes[i].copy(nodes[i - 1]);
    if (withIntro) nodes[i].x += state.rest;
    else nodes[i].y -= state.rest;
  }
  body.quaternion.identity();
  if (withIntro) {
    body.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  }
  body.hang.set(0, metrics.hangY, 0);
  const hangWorld = SCRATCH.a.copy(body.hang).applyQuaternion(body.quaternion);
  body.position.copy(nodes[NUM_SEGMENTS]).sub(hangWorld);
  body.previous.copy(body.position);
  body.previousQuaternion.copy(body.quaternion);
  body.velocity.set(0, 0, 0);
  body.angular.set(0, 0, 0);
  if (withIntro) {
    body.velocity.set(-4.5, -1.5, 0);
    body.angular.z = -5.5;
  }
  for (let i = 0; i <= NUM_SEGMENTS; i++) {
    previous[i].copy(nodes[i]);
    velocities[i].set(0, 0, 0);
  }
  state.lengths.fill(state.rest);
  state.turn = 0;
  state.twist = 0;
  state.twistRaw = 0;
  state.calm = 0;
}

function configureMassProperties(state, metrics, totalLength) {
  state.rest = totalLength / NUM_SEGMENTS;
  const { width, height } = metrics;
  const body = state.body;
  const depth = 0.032;
  body.mass = 1;
  body.inverseInertia.set(
    12 / (height * height + depth * depth),
    12 / (width * width + depth * depth),
    12 / (width * width + height * height)
  );
  body.hang.set(0, metrics.hangY, 0);
}

function stepPhysics(state, dt, params, elapsed) {
  const steps = Math.max(1, Math.ceil(dt / TIME_STEP - 1e-6));
  const h = dt / steps;
  const { nodes, previous, velocities, body } = state;
  const windX = params.breeze * (Math.sin(elapsed * 0.53) * 0.7 + Math.sin(elapsed * 1.31 + 1.7) * 0.3) * 3;
  const windZ = params.breeze * Math.sin(elapsed * 0.37 + 0.6) * 2;
  const grab = state.grab;
  const pin = SCRATCH.pin;
  const nodeDecay = Math.exp(-params.nodeDrag * h);
  const linDecay = Math.exp(-params.linearDrag * h);
  const angDecay = Math.exp(-params.angularDrag * h);

  for (let s = 0; s < steps; s++) {
    for (let i = 1; i < NUM_SEGMENTS; i++) {
      const v = velocities[i];
      v.y -= params.gravity * h;
      v.x += windX * h;
      v.z += windZ * h;
      previous[i].copy(nodes[i]);
      nodes[i].addScaledVector(v, h);
    }
    body.previous.copy(body.position);
    body.previousQuaternion.copy(body.quaternion);
    const q = body.quaternion;
    if (grab) {
      const errQ = SCRATCH.q.copy(grab.rotation).multiply(SCRATCH.r.copy(q).invert());
      if (errQ.w < 0) errQ.set(-errQ.x, -errQ.y, -errQ.z, -errQ.w);
      const torque = SCRATCH.a.set(errQ.x, errQ.y, errQ.z).multiplyScalar(2 * params.grip);
      torque.addScaledVector(body.angular, -params.gripDamping);
      body.angular.addScaledVector(applyWorldInertia(body, torque, SCRATCH.b), h);
    }
    const upAxis = SCRATCH.a.set(0, 1, 0).applyQuaternion(q);
    const proj = SCRATCH.b.set(-upAxis.x * upAxis.z, -upAxis.y * upAxis.z, 1 - upAxis.z * upAxis.z);
    if (proj.lengthSq() > 0.001) {
      const fwd = SCRATCH.d.set(0, 0, 1).applyQuaternion(q);
      const angle = Math.atan2(SCRATCH.e.crossVectors(proj, fwd).dot(upAxis), proj.dot(fwd));
      let diff = angle - state.twistRaw;
      if (diff > Math.PI) diff -= Math.PI * 2;
      else if (diff < -Math.PI) diff += Math.PI * 2;
      state.twist += diff;
      state.twistRaw = angle;
    }
    if (!grab) {
      const twistVel = body.angular.dot(upAxis);
      body.angular.addScaledVector(
        upAxis,
        (params.twist * (state.turn - state.twist) - params.twistDamping * twistVel) * h
      );
    }
    body.velocity.y -= params.gravity * h;
    body.velocity.x += windX * 0.35 * h;
    body.velocity.z += windZ * 0.35 * h;
    body.position.addScaledVector(body.velocity, h);
    integrateQuaternion(body.quaternion, SCRATCH.f.copy(body.angular).multiplyScalar(h));
    state.impulses.fill(0);
    if (grab) pin.lerpVectors(grab.from, grab.target, (s + 1) / steps);
    for (let iter = 0; iter < SOLVER_ITERS; iter++) {
      for (let i = 0; i < NUM_SEGMENTS; i++) solveSegment(state, i, h, params);
      if (grab) solveGrab(body, grab, pin);
    }
    for (let i = 1; i < NUM_SEGMENTS; i++) {
      const v = velocities[i].subVectors(nodes[i], previous[i]).divideScalar(h).multiplyScalar(nodeDecay);
      v.multiplyScalar(1 / (1 + params.nodeAir * v.length() * h));
    }
    body.velocity.subVectors(body.position, body.previous).divideScalar(h);
    const dq = SCRATCH.q.copy(body.previousQuaternion).invert().premultiply(body.quaternion);
    body.angular.set(dq.x, dq.y, dq.z).multiplyScalar((2 / h) * (dq.w < 0 ? -1 : 1));
    const normal = SCRATCH.a.set(0, 0, 1).applyQuaternion(body.quaternion);
    const normalVel = body.velocity.dot(normal);
    const tangentVel = SCRATCH.b.copy(body.velocity).addScaledVector(normal, -normalVel);
    tangentVel.multiplyScalar(1 / (1 + params.air * tangentVel.length() * h));
    body.velocity
      .copy(tangentVel)
      .addScaledVector(normal, normalVel / (1 + params.broadside * Math.abs(normalVel) * h))
      .multiplyScalar(linDecay);
    body.angular.multiplyScalar(angDecay / (1 + params.spinAir * body.angular.length() * h));
    if (body.velocity.lengthSq() > 3600) body.velocity.setLength(60);
    if (body.angular.lengthSq() > 1600) body.angular.setLength(40);
    nodes[NUM_SEGMENTS].copy(body.hang).applyQuaternion(body.quaternion).add(body.position);
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      state.lengths[i] = nodes[i].distanceTo(nodes[i + 1]);
    }
  }
  if (grab) grab.from.copy(grab.target);
}

export function Lanyard({
  photoUrl = '/assets/ejaa-thala.png',
  orientation = 'portrait',
  finish = 'glossy',
  cornerRadius = 0.25,
  size = 0.62,
  anchor = 'right',
  strapLength = 0.59,
  strapWidth = 0.62,
  metal = 'gold',
  gravity = 1.2,
  damping = 0.35,
  elasticity = 0.7,
  breeze = 0.1,
  interactive = true,
  autoFlip = true,
  intro = true,
  className = '',
  style,
}) {
  const containerRef = useRef(null);
  const propsRef = useRef(null);
  const rebuildRef = useRef(null);

  propsRef.current = {
    photoUrl,
    orientation,
    finish,
    cornerRadius,
    size,
    anchor,
    strapLength,
    strapWidth,
    metal,
    gravity,
    damping,
    elasticity,
    breeze,
    interactive,
    autoFlip,
    intro,
  };

  useEffect(() => {
    rebuildRef.current?.();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const domElement = renderer.domElement;
    domElement.className = 'lanyard-canvas';
    domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(domElement);

    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = new THREE.Scene();
    const envTarget = createStudioEnvironment(renderer);
    scene.environment = envTarget.texture;

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 200);
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
    keyLight.position.set(-2.5, 4, 6);
    const fillLight = new THREE.DirectionalLight(0xffedd5, 0.45);
    fillLight.position.set(3, -1, 4);
    scene.add(keyLight, fillLight);

    const frontCanvas = document.createElement('canvas');
    const backCanvas = document.createElement('canvas');
    const strapCanvas = document.createElement('canvas');

    const frontTex = new THREE.CanvasTexture(frontCanvas);
    frontTex.colorSpace = THREE.SRGBColorSpace;
    frontTex.anisotropy = maxAnisotropy;

    const backTex = new THREE.CanvasTexture(backCanvas);
    backTex.colorSpace = THREE.SRGBColorSpace;
    backTex.anisotropy = maxAnisotropy;

    const strapTex = new THREE.CanvasTexture(strapCanvas);
    strapTex.colorSpace = THREE.SRGBColorSpace;
    strapTex.anisotropy = maxAnisotropy;
    strapTex.wrapS = THREE.ClampToEdgeWrapping;
    strapTex.wrapT = THREE.RepeatWrapping;

    const normalMap = createPlasticNormalMap();

    const frontMat = new THREE.MeshPhysicalMaterial({
      map: frontTex,
      normalMap,
      normalScale: new THREE.Vector2(0.05, 0.05),
      roughness: 0.38,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });

    const backMat = new THREE.MeshPhysicalMaterial({
      map: backTex,
      normalMap,
      normalScale: new THREE.Vector2(0.05, 0.05),
      roughness: 0.38,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#1c060a'),
      roughness: 0.3,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(METALS.gold.color),
      metalness: 1,
      roughness: METALS.gold.roughness,
    });

    const strapMat = new THREE.MeshPhysicalMaterial({
      map: strapTex,
      roughness: 0.65,
      sheen: 1,
      sheenRoughness: 0.42,
      sheenColor: new THREE.Color(0.35, 0.25, 0.28),
      side: THREE.DoubleSide,
    });

    const cardGroup = new THREE.Group();
    const bodyMesh = new THREE.Mesh(undefined, bodyMat);
    const frontMesh = new THREE.Mesh(undefined, frontMat);
    const backMesh = new THREE.Mesh(undefined, backMat);
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 18, 72), metalMat);
    ringMesh.rotation.y = Math.PI / 2 - 0.7;
    cardGroup.add(bodyMesh, frontMesh, backMesh, ringMesh);
    rootGroup.add(cardGroup);

    const ribbonGeom = createRibbonGeometry(RIBBON_POINTS);
    const ribbonMesh = new THREE.Mesh(ribbonGeom, strapMat);
    ribbonMesh.frustumCulled = false;
    rootGroup.add(ribbonMesh);

    const hardwareGroup = new THREE.Group();
    const clipMesh = new THREE.Mesh(createClipGeometry(CLIP_WIDTH), metalMat);
    clipMesh.position.y = 0.107;
    const hookMesh = new THREE.Mesh(new THREE.TorusGeometry(HOOK_RADIUS, 0.0105, 14, 40), metalMat);
    hardwareGroup.add(clipMesh, hookMesh);
    rootGroup.add(hardwareGroup);

    const phys = createPhysicsState();
    const curveNodes = [];
    const ctrlA = new THREE.Vector3();
    const ctrlB = new THREE.Vector3();
    const curve = new THREE.CatmullRomCurve3(curveNodes, false, 'centripetal');
    const viewSize = { width: 1, height: 1 };
    let metrics = getCardMetrics('portrait', 0.25);
    let cache = {};
    let currentStrapWidth = CLIP_WIDTH;
    let strapAspect = drawStrapCanvas(strapCanvas);
    strapTex.needsUpdate = true;

    // Initial draw before image loads, then redraw once photo loads
    drawFrontCardCanvas(frontCanvas, null);
    drawBackCardCanvas(backCanvas);
    frontTex.needsUpdate = true;
    backTex.needsUpdate = true;

    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      drawFrontCardCanvas(frontCanvas, img);
      frontTex.needsUpdate = true;
      scheduleFrame();
    };
    img.src = propsRef.current.photoUrl;

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let introStartTime = null;
    let introOffsetX = 0;
    let nextFlipTime = 6 + Math.random() * 6;
    let autoFlipTriggered = false;
    let inView = true;
    let initialized = false;
    let hoveringCard = false;
    let clickTrack = null;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const updateFraming = () => {
      const p = propsRef.current;
      const aspect = viewSize.width / viewSize.height;
      let frustumH = metrics.height / clamp(p.size, 0.15, 0.9);
      const minW = metrics.width / 0.72;
      if (frustumH * aspect < minW) frustumH = minW / aspect;
      const frustumW = frustumH * aspect;

      camera.aspect = aspect;
      camera.position.set(0, 0, frustumH / 2 / Math.tan((CAMERA_FOV * Math.PI) / 360));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      const anchorX = ((ANCHORS[p.anchor] ?? 0.5) - 0.5) * frustumW;
      if (!initialized && p.intro && !reducedMotion) {
        introOffsetX = frustumW * 1.15;
        rootGroup.position.x = introOffsetX;
      }
      const topY = frustumH / 2 + 0.05;
      const hangTargetY =
        frustumH / 2 -
        frustumH * lerp(0.12, 0.42, clamp(p.strapLength, 0, 1)) +
        (metrics.hangY - metrics.height / 2);
      phys.anchor.set(anchorX, topY, 0);
      configureMassProperties(phys, metrics, topY - hangTargetY);
      phys.nodes[0].copy(phys.anchor);
      phys.previous[0].copy(phys.anchor);
    };

    const syncConfig = () => {
      const p = propsRef.current;
      if (p.intro && !cache.intro && !reducedMotion) {
        initialized = false;
        introStartTime = null;
      }
      const layoutKey = `${p.orientation}|${p.cornerRadius}`;
      if (layoutKey !== cache.layoutKey) {
        metrics = getCardMetrics(p.orientation, p.cornerRadius);
        const geoms = createCardGeometries(metrics);
        bodyMesh.geometry?.dispose();
        frontMesh.geometry?.dispose();
        backMesh.geometry?.dispose();
        bodyMesh.geometry = geoms.body;
        frontMesh.geometry = geoms.face;
        backMesh.geometry = geoms.face.clone();
        frontMesh.position.z = 0.0166;
        backMesh.rotation.y = Math.PI;
        backMesh.position.z = -0.0166;
        ringMesh.position.set(0, metrics.ringY, 0);
        cache.framingKey = '';
      }
      const framingKey = `${layoutKey}|${p.size}|${p.anchor}|${p.strapLength}|${p.intro}|${viewSize.width}|${viewSize.height}`;
      if (framingKey !== cache.framingKey) {
        updateFraming();
        if (initialized) {
          if (layoutKey !== cache.layoutKey) resetPhysics(phys, metrics, false);
        } else {
          resetPhysics(phys, metrics, p.intro && !reducedMotion);
          initialized = true;
        }
      }
      const metalCfg = METALS[p.metal] || METALS.gold;
      metalMat.color.set(metalCfg.color);
      metalMat.roughness = metalCfg.roughness;

      currentStrapWidth = CLIP_WIDTH * clamp(p.strapWidth, 0.4, 2);
      if (currentStrapWidth !== cache.strapScale) {
        clipMesh.geometry?.dispose();
        clipMesh.geometry = createClipGeometry(currentStrapWidth);
      }
      domElement.style.touchAction = p.interactive ? 'pan-y' : 'auto';
      cache = {
        layoutKey,
        framingKey,
        strapScale: currentStrapWidth,
        intro: p.intro,
      };
      scheduleFrame();
    };

    const sampledPts = Array.from({ length: RIBBON_POINTS }, () => new THREE.Vector3());
    const binormals = Array.from({ length: RIBBON_POINTS }, () => new THREE.Vector3());
    const sectionCosSin = RIBBON_ANGLES.map((a) => [Math.cos(a), Math.sin(a)]);
    const ribbonScratch = {
      tangent: new THREE.Vector3(),
      toCamera: new THREE.Vector3(),
      basis: new THREE.Matrix4(),
      up: new THREE.Vector3(),
      across: new THREE.Vector3(),
      facing: new THREE.Vector3(),
      end: new THREE.Vector3(),
    };

    const updateRibbonMesh = () => {
      const endNode = phys.nodes[NUM_SEGMENTS];
      const leadDist = 0.236;
      let idx = 3;
      while (idx > 0 && phys.nodes[idx].distanceTo(endNode) < leadDist * 1.1) idx--;
      const upDir = ribbonScratch.up.subVectors(phys.nodes[idx], endNode);
      if (upDir.lengthSq() < 1e-8) upDir.set(0, 1, 0).applyQuaternion(phys.body.quaternion);
      upDir.normalize();
      ctrlA.copy(endNode).addScaledVector(upDir, leadDist);
      ctrlB.copy(endNode).addScaledVector(upDir, 0.0885);

      curveNodes.length = 0;
      for (let i = 0; i <= idx; i++) curveNodes.push(phys.nodes[i]);
      curveNodes.push(ctrlA, ctrlB);
      curve.updateArcLengths();
      for (let i = 0; i < RIBBON_POINTS; i++) {
        curve.getPointAt(i / 71, sampledPts[i]);
      }
      const totalLen = curve.getLength();
      const twistZone = 1 - ctrlA.distanceTo(ctrlB) / Math.max(totalLen, 0.001);
      const posAttr = ribbonGeom.getAttribute('position');
      const normAttr = ribbonGeom.getAttribute('normal');
      const uvAttr = ribbonGeom.getAttribute('uv');
      const cols = RIBBON_U.length;
      const restLen = phys.rest * NUM_SEGMENTS;
      const vRepeat = restLen / (currentStrapWidth * strapAspect);
      const effWidth = currentStrapWidth / Math.max(1, totalLen / Math.max(restLen, 0.001)) ** 0.35;
      const { tangent, toCamera, across, facing } = ribbonScratch;

      for (let i = 0; i < RIBBON_POINTS; i++) {
        tangent.subVectors(sampledPts[Math.min(71, i + 1)], sampledPts[Math.max(0, i - 1)]);
        if (tangent.lengthSq() < 1e-12) tangent.set(0, -1, 0);
        tangent.normalize();
        toCamera.subVectors(camera.position, sampledPts[i]).normalize();
        const bi = binormals[i].crossVectors(toCamera, tangent);
        if (bi.lengthSq() < 1e-10) {
          bi.copy(i > 0 ? binormals[i - 1] : SCRATCH.a.set(1, 0, 0));
        }
        bi.normalize();
        if (i > 0 && bi.dot(binormals[i - 1]) < 0) bi.negate();

        const twistAngle = -phys.twist * Math.min(1, i / 71 / twistZone) ** 1.3;
        facing.crossVectors(tangent, bi);
        across.copy(bi).multiplyScalar(Math.cos(twistAngle)).addScaledVector(facing, Math.sin(twistAngle));
        facing.crossVectors(tangent, across);

        const pt = sampledPts[i];
        const vCoord = (1 - i / 71) * vRepeat;
        for (let c = 0; c < cols; c++) {
          const vertIdx = i * cols + c;
          const offset = (RIBBON_U[c] - 0.5) * effWidth;
          const [cs, sn] = sectionCosSin[c];
          posAttr.setXYZ(vertIdx, pt.x + across.x * offset, pt.y + across.y * offset, pt.z + across.z * offset);
          normAttr.setXYZ(
            vertIdx,
            facing.x * cs + across.x * sn,
            facing.y * cs + across.y * sn,
            facing.z * cs + across.z * sn
          );
          uvAttr.setXY(vertIdx, RIBBON_U[c], vCoord);
        }
      }
      ribbonScratch.end.copy(across);
      posAttr.needsUpdate = true;
      normAttr.needsUpdate = true;
      uvAttr.needsUpdate = true;

      across.copy(ribbonScratch.end).addScaledVector(upDir, -ribbonScratch.end.dot(upDir)).normalize();
      facing.crossVectors(across, upDir).normalize();
      ribbonScratch.basis.makeBasis(across, upDir, facing);
      hardwareGroup.quaternion.setFromRotationMatrix(ribbonScratch.basis);
      hardwareGroup.position.copy(endNode);
    };

    const renderScene = () => {
      cardGroup.position.copy(phys.body.position);
      cardGroup.quaternion.copy(phys.body.quaternion);
      updateRibbonMesh();
      renderer.render(scene, camera);
    };

    const getSimParams = () => {
      const p = propsRef.current;
      const g = 40 * clamp(p.gravity, 0, 3);
      const base = Math.max(g, 20);
      const el = clamp(p.elasticity, 0, 1);
      const dmp = clamp(p.damping, 0, 1);
      return {
        gravity: g,
        hold: base * lerp(2.2, 5.5, el),
        stiffness: base * 10 * NUM_SEGMENTS,
        spring: base * lerp(0.1, 0.4, el) * NUM_SEGMENTS,
        bandDamping: base * lerp(0.3, 0.08, el) * NUM_SEGMENTS,
        linearDrag: 0.25 * 16 ** dmp,
        angularDrag: 0.5 * 12 ** dmp,
        air: 0.15,
        broadside: 0.5,
        spinAir: 0.03,
        nodeDrag: 2,
        nodeAir: 0.2,
        twist: 30,
        twistDamping: 3,
        grip: 40,
        gripDamping: 6,
        breeze: reducedMotion ? 0 : clamp(p.breeze, 0, 1),
      };
    };

    const triggerFlip = (hitPoint, impulseStrength = FLIP_IMPULSE) => {
      const body = phys.body;
      const upAxis = SCRATCH.a.set(0, 1, 0).applyQuaternion(body.quaternion);
      let dir = phys.turn > 0 ? -1 : 1;
      if (phys.turn === 0) {
        const toCam = SCRATCH.c.subVectors(hitPoint, camera.position).normalize();
        dir = SCRATCH.b.subVectors(hitPoint, body.position).cross(toCam).dot(upAxis) < 0 ? -1 : 1;
      }
      phys.turn = phys.turn === 0 ? Math.PI * dir : 0;
      body.angular.addScaledVector(upAxis, impulseStrength * dir);
    };

    const tick = (now) => {
      rafId = 0;
      if (!active) return;
      const dt = Math.min(1 / 30, Math.max(1 / 240, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      if (introOffsetX > 0) {
        if (introStartTime === null) introStartTime = now;
        const t = clamp((now - introStartTime) / 100, 0, 1);
        const eased = 1 - (1 - t) ** 3;
        rootGroup.position.x = introOffsetX * (1 - eased);
        if (t === 1) introOffsetX = 0;
      }

      const simParams = getSimParams();
      if (propsRef.current.autoFlip && !reducedMotion && !phys.grab) {
        if (autoFlipTriggered && phys.twist * Math.sign(phys.turn) >= Math.PI * 0.85) {
          autoFlipTriggered = false;
          triggerFlip(phys.body.position, 3.5);
          nextFlipTime = elapsed + 8 + Math.random() * 12;
        } else if (!autoFlipTriggered && phys.turn === 0 && elapsed >= nextFlipTime) {
          triggerFlip(phys.body.position, 3.5);
          autoFlipTriggered = phys.turn !== 0;
        }
      }

      stepPhysics(phys, dt, simParams, elapsed);
      const b = phys.body;
      if (!Number.isFinite(b.position.x + b.position.y + b.position.z + b.quaternion.w)) {
        phys.grab = null;
        resetPhysics(phys, metrics, false);
      }
      renderScene();
      if (inView) {
        rafId = requestAnimationFrame(tick);
      }
    };

    function scheduleFrame() {
      if (!rafId && inView && active) {
        phys.calm = 0;
        lastTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    }

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const updateRay = (e) => {
      const rect = domElement.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
    };

    const raycastCard = () => {
      cardGroup.updateMatrixWorld();
      return raycaster.intersectObjects([bodyMesh, frontMesh, backMesh], false)[0] || null;
    };

    const setCursor = (c) => {
      if (domElement.style.cursor !== c) domElement.style.cursor = c;
    };

    const onPointerDown = (e) => {
      if (!propsRef.current.interactive || e.button > 0) return;
      updateRay(e);
      const hit = raycastCard();
      if (hit) {
        phys.grab = {
          local: hit.point
            .clone()
            .sub(phys.body.position)
            .applyQuaternion(phys.body.quaternion.clone().invert()),
          rotation: phys.body.quaternion.clone(),
          reach: hit.distance,
          from: hit.point.clone(),
          target: hit.point.clone(),
        };
        clickTrack = {
          x: e.clientX,
          y: e.clientY,
          time: performance.now(),
          point: hit.point.clone(),
        };
        domElement.setPointerCapture?.(e.pointerId);
        setCursor('grabbing');
        e.preventDefault();
        scheduleFrame();
      }
    };

    const onPointerMove = (e) => {
      if (!propsRef.current.interactive) return;
      updateRay(e);
      if (phys.grab) {
        if (clickTrack && Math.hypot(e.clientX - clickTrack.x, e.clientY - clickTrack.y) > 6) {
          clickTrack = null;
        }
        raycaster.ray.at(phys.grab.reach, phys.grab.target);
        scheduleFrame();
      } else if (e.pointerType !== 'touch') {
        hoveringCard = !!raycastCard();
        setCursor(hoveringCard ? 'grab' : '');
      }
    };

    const onPointerUp = (e) => {
      if (phys.grab) {
        phys.grab = null;
        if (clickTrack && e.type === 'pointerup' && performance.now() - clickTrack.time < 450) {
          triggerFlip(clickTrack.point);
        }
        clickTrack = null;
        domElement.releasePointerCapture?.(e.pointerId);
        setCursor(hoveringCard && e.pointerType !== 'touch' ? 'grab' : '');
        scheduleFrame();
      }
    };

    const onTouchStart = (e) => {
      if (propsRef.current.interactive && e.touches.length === 1) {
        updateRay(e.touches[0]);
        if (raycastCard()) e.preventDefault();
      }
    };

    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('pointercancel', onPointerUp);
    domElement.addEventListener('lostpointercapture', onPointerUp);
    domElement.addEventListener('touchstart', onTouchStart, { passive: false });

    const onResize = () => {
      viewSize.width = Math.max(1, container.clientWidth);
      viewSize.height = Math.max(1, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(viewSize.width, viewSize.height, false);
      syncConfig();
      renderScene();
    };

    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) scheduleFrame();
    });
    io.observe(container);

    rebuildRef.current = syncConfig;
    onResize();

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      rebuildRef.current = null;
      ro.disconnect();
      io.disconnect();
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerup', onPointerUp);
      domElement.removeEventListener('pointercancel', onPointerUp);
      domElement.removeEventListener('lostpointercapture', onPointerUp);
      domElement.removeEventListener('touchstart', onTouchStart);
      [bodyMesh, frontMesh, backMesh, ringMesh, clipMesh, hookMesh, ribbonMesh].forEach((m) =>
        m.geometry?.dispose()
      );
      [frontMat, backMat, bodyMat, metalMat, strapMat].forEach((m) => m.dispose());
      [frontTex, backTex, strapTex, normalMap].forEach((t) => t.dispose());
      envTarget.dispose();
      renderer.dispose();
      if (domElement.parentNode) domElement.parentNode.removeChild(domElement);
    };
  }, []);

  return <div ref={containerRef} className={`lanyard ${className}`.trim()} style={style} />;
}

export function HeroLanyardSection({ introFinished }) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <section
      className={`lanyard-card-container${isMobile ? ' is-mobile' : ''}`}
      aria-label="Interactive 3D Lanyard"
    >
      <div className="lanyard-viewport">
        <Lanyard
          photoUrl="/assets/ejaa-thala.png"
          finish="glossy"
          anchor={isMobile ? 'center' : 'right'}
          orientation="portrait"
          size={0.62}
          cornerRadius={0.25}
          strapLength={0.59}
          strapWidth={0.62}
          gravity={1.2}
          damping={0.35}
          elasticity={0.7}
          breeze={0.1}
          interactive={true}
          autoFlip={true}
          metal="gold"
          intro={introFinished}
        />
      </div>
    </section>
  );
}
