const Jimp = require('jimp');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'public', 'photo3.PNG');
const outPath = path.join(__dirname, '..', 'public', 'photo3_trimmed.PNG');
const backupPath = path.join(__dirname, '..', 'public', 'photo3.backup.PNG');
const TOLERANCE = 80;

function colorDistance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function run() {
  try {
    const img = await Jimp.read(srcPath);
    const w = img.bitmap.width;
    const h = img.bitmap.height;

    // backup
    await img.clone().writeAsync(backupPath);

    // sample corners for background color
    const corners = [
      img.getPixelColor(0, 0),
      img.getPixelColor(w - 1, 0),
      img.getPixelColor(0, h - 1),
      img.getPixelColor(w - 1, h - 1),
    ].map((c) => Jimp.intToRGBA(c));

    const bg = corners.reduce((acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }), { r: 0, g: 0, b: 0 });
    bg.r = Math.round(bg.r / corners.length);
    bg.g = Math.round(bg.g / corners.length);
    bg.b = Math.round(bg.b / corners.length);

    // make near-bg pixels transparent
    img.scan(0, 0, w, h, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      const dist = colorDistance({ r, g, b }, bg);
      if (dist <= TOLERANCE) {
        this.bitmap.data[idx + 3] = 0;
      }
    });

    // find bounding box of non-transparent pixels
    let minX = w, minY = h, maxX = 0, maxY = 0;
    img.scan(0, 0, w, h, function (x, y, idx) {
      const a = this.bitmap.data[idx + 3];
      if (a > 10) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    });

    if (minX > maxX || minY > maxY) {
      throw new Error('No foreground detected');
    }

    // add padding
    const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.15);
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;

    const cropped = img.clone().crop(minX, minY, cropW, cropH);

    // make square canvas and center the crop, then resize to 256
    const size = Math.max(cropW, cropH);
    const canvas = new Jimp(size, size, 0x00000000);
    const x = Math.round((size - cropW) / 2);
    const y = Math.round((size - cropH) / 2);
    canvas.composite(cropped, x, y);
    await canvas.resize(256, 256, Jimp.RESIZE_BEZIER).writeAsync(outPath);

    console.log('Wrote trimmed image to', outPath, 'backup at', backupPath);
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  }
}

run();
