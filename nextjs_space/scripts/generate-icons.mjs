/**
 * BütçeM PWA ikon üreteci
 * Çalıştırmak için: node scripts/generate-icons.mjs
 * (sharp paketi yoksa: npm install sharp --save-dev)
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Arkaplan
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Yeşil daire
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.fill();

  // ₺ sembolü
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.42}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₺', size / 2, size / 2 + size * 0.03);

  return canvas.toBuffer('image/png');
}

[192, 512].forEach(size => {
  const buf = generateIcon(size);
  writeFileSync(join(outDir, `icon-${size}.png`), buf);
  console.log(`✅ icon-${size}.png oluşturuldu`);
});

console.log('\n🎉 İkonlar hazır: public/icons/');
