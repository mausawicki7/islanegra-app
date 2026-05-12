import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ids = [
  'islanegra-classic',
  'doble-negra',
  'la-fundida',
  'smoke-house',
  'crispy-onion',
  'la-salvaje',
];

const outDir = path.resolve('public/burgers');
await fs.mkdir(outDir, { recursive: true });

const results = [];
for (const id of ids) {
  const src = path.resolve(`${id}.png`);
  const dst = path.join(outDir, `${id}.webp`);
  const srcStat = await fs.stat(src);
  await sharp(src)
    .resize(800, 800, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toFile(dst);
  const dstStat = await fs.stat(dst);
  results.push({
    id,
    fromKB: Math.round(srcStat.size / 1024),
    toKB: Math.round(dstStat.size / 1024),
  });
}

console.table(results);
