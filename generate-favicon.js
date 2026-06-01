const Jimp = require('jimp');
const path = require('path');
const src = path.join(__dirname, 'public', 'foodeez-sidebar-logo.png');
const dst = path.join(__dirname, 'public', 'favicon.ico');

Jimp.read(src)
  .then((image) => image.resize(64, 64).writeAsync(dst))
  .then(() => console.log('favicon.ico created'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
