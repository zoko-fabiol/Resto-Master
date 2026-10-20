import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([lenBuf, toCrc, crcBuf]);
}

function createPng(
  width: number,
  height: number,
  getPixel: (x: number, y: number, w: number, h: number) => [number, number, number, number]
): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Rendu élégant de l'emblème RestoMaster OS
function renderRestoMasterPixel(
  x: number,
  y: number,
  w: number,
  h: number,
  isMaskable: boolean
): [number, number, number, number] {
  // Coordonnées normalisées (-1 à +1)
  const scale = isMaskable ? 0.72 : 0.88;
  const nx = ((x / w) * 2 - 1) / scale;
  const ny = ((y / h) * 2 - 1) / scale;

  const bgDark: [number, number, number, number] = [15, 23, 42, 255]; // #0f172a (Slate 900)
  const amberPrimary: [number, number, number, number] = [217, 119, 6, 255]; // #d97706
  const amberBright: [number, number, number, number] = [245, 158, 11, 255]; // #f59e0b
  const amberLight: [number, number, number, number] = [251, 191, 36, 255]; // #fbbf24

  // Coin arrondi du badge pour les icônes standards
  if (!isMaskable) {
    const rDist = Math.max(Math.abs(nx), Math.abs(ny));
    // Cadre extérieur
    if (rDist > 0.98) return [0, 0, 0, 0];
    if (rDist > 0.92) return amberPrimary;
  }

  // 1. Bouton supérieur / Étoile (Knob du chapeau de chef / cloche)
  const knobDistSq = nx * nx + (ny - -0.45) * (ny - -0.45);
  if (knobDistSq <= 0.08 * 0.08) {
    return amberBright;
  }

  // 2. Dome de la cloche (demi-ellipse)
  if (ny >= -0.35 && ny <= 0.2) {
    const rx = 0.52;
    const ry = 0.55;
    const ellipseVal = (nx * nx) / (rx * rx) + ((ny - 0.2) * (ny - 0.2)) / (ry * ry);
    if (ellipseVal <= 1.0) {
      // Effet de reflet supérieur subtil
      if (ellipseVal <= 0.85 && ny < -0.05 && nx < 0.2) {
        return amberLight;
      }
      return amberPrimary;
    }
  }

  // 3. Poignée / ligne médiane sous la cloche
  if (ny >= 0.2 && ny <= 0.26 && Math.abs(nx) <= 0.56) {
    return amberBright;
  }

  // 4. Plateau de service (base plate)
  if (ny >= 0.32 && ny <= 0.40 && Math.abs(nx) <= 0.68) {
    return amberBright;
  }

  // 5. Pied / socle raffiné
  if (ny >= 0.40 && ny <= 0.45 && Math.abs(nx) <= 0.40) {
    return amberPrimary;
  }

  return bgDark;
}

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// Génération des 4 icônes conformes PWA
const iconTargets = [
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'maskable-icon-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
];

console.log('Génération des icônes PWA RestoMaster OS...');
for (const target of iconTargets) {
  const buf = createPng(target.size, target.size, (x, y, w, h) =>
    renderRestoMasterPixel(x, y, w, h, target.maskable)
  );
  const outPath = path.join(publicDir, target.name);
  fs.writeFileSync(outPath, buf);
  console.log(`[✓] Créé : ${target.name} (${target.size}x${target.size}) -> ${buf.length} octets`);
}

console.log('Toutes les icônes PWA ont été générées avec succès.');
