import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Lossless only: keep dimensions, orientation, ICC profiles and decoded pixels.
const references = new Set();
for (const entry of await fs.readdir('src', { recursive: true })) {
  if (!/\.(astro|json|md)$/.test(entry) || entry === 'content/image-assets.json') continue;
  const source = await fs.readFile(path.join('src', entry), 'utf8');
  for (const match of source.matchAll(/\/uploads\/[^"'`\s)]+?\.(?:png|jpe?g)/g)) references.add(match[0]);
}
const manifest = {};
let originalBytes = 0, optimizedBytes = 0;
for (const src of [...references].sort()) {
  const input = path.join('public', src);
  const original = await fs.readFile(input);
  const output = await sharp(original).rotate().keepIccProfile().webp({ lossless: true, effort: 6 }).toBuffer();
  const raw = async buffer => sharp(buffer).rotate().toColourspace('srgb').ensureAlpha().raw().toBuffer();
  if (output.length < original.length * 0.9) {
    if (!(await raw(original)).equals(await raw(output))) throw new Error(`Pixels changed: ${src}`);
    const optimizedSrc = src.replace('/uploads/', '/uploads/optimized/').replace(/\.(png|jpe?g)$/, '.webp');
    const target = path.join('public', optimizedSrc);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, output);
    const { width, height } = await sharp(output).metadata();
    manifest[src] = { src: optimizedSrc, width, height };
    originalBytes += original.length; optimizedBytes += output.length;
    console.log(`${src}: ${original.length} -> ${output.length} bytes (identical pixels)`);
  }
}
await fs.writeFile('src/content/image-assets.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ files: Object.keys(manifest).length, originalBytes, optimizedBytes }));
