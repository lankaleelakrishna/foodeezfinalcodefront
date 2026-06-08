const Jimp = require('jimp');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'public', 'photo2.PNG');
const outPath = srcPath; // overwrite
const TOLERANCE = 80; // color distance tolerance (0-441)

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

    const corners = [
      img.getPixelColor(0, 0),
      img.getPixelColor(w - 1, 0),
      img.getPixelColor(0, h - 1),
      img.getPixelColor(w - 1, h - 1),
    ].map((c) => Jimp.intToRGBA(c));

    // average corner color
    const bg = corners.reduce((acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }), { r: 0, g: 0, b: 0 });
    bg.r = Math.round(bg.r / corners.length);
    bg.g = Math.round(bg.g / corners.length);
    bg.b = Math.round(bg.b / corners.length);

    // iterate pixels and make close-to-bg pixels transparent
    img.scan(0, 0, w, h, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      const a = this.bitmap.data[idx + 3];

      const dist = colorDistance({ r, g, b }, bg);
      if (dist <= TOLERANCE) {
        // set alpha 0
        this.bitmap.data[idx + 3] = 0;
      }
    });

    await img.writeAsync(outPath);
    console.log('Wrote transparent image to', outPath);
  } catch (err) {
    console.error('Error processing image:', err.message);
    process.exitCode = 1;
  }
}

run();
