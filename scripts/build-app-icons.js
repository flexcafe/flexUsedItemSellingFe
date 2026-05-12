/**
 * Regenerates launcher icons so the logo fits Android adaptive-icon safe zone
 * (72dp circle inside 108dp cell → ~2/3 diameter) and iOS home-screen masking.
 * Source: assets/images/flex-used-logo.png
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const CANVAS = 1024;
/** Material adaptive icon: keep artwork inside central 72/108 of the asset */
const SAFE_DIAMETER = CANVAS * (72 / 108) * 0.96;
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "assets/images/flex-used-logo.png");
const OUT_ANDROID = path.join(ROOT, "assets/images/android-icon-foreground.png");
const OUT_IOS = path.join(ROOT, "assets/images/icon.png");
const IOS_BG = { r: 255, g: 247, b: 237, alpha: 1 }; // #FFF7ED — matches app.json adaptiveIcon.backgroundColor

async function fitInSafeCircle(srcPath, destPath, canvasBackground, flattenRgb) {
  const meta = await sharp(srcPath).metadata();
  const w = meta.width ?? CANVAS;
  const h = meta.height ?? CANVAS;
  const diag = Math.sqrt(w * w + h * h);
  const scale = SAFE_DIAMETER / diag;
  const newW = Math.max(1, Math.round(w * scale));
  const newH = Math.max(1, Math.round(h * scale));
  const resized = await sharp(srcPath).resize(newW, newH).png().toBuffer();
  const left = Math.floor((CANVAS - newW) / 2);
  const top = Math.floor((CANVAS - newH) / 2);

  let pipeline = sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: canvasBackground,
    },
  }).composite([{ input: resized, left, top }]);

  if (flattenRgb) {
    pipeline = pipeline.flatten({ background: flattenRgb });
  }

  await pipeline.png().toFile(destPath);
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error("Missing source:", SRC);
    process.exit(1);
  }
  await fitInSafeCircle(SRC, OUT_ANDROID, { r: 0, g: 0, b: 0, alpha: 0 }, null);
  await fitInSafeCircle(SRC, OUT_IOS, IOS_BG, "#FFF7ED");
  console.log("Wrote", path.relative(ROOT, OUT_ANDROID), "and", path.relative(ROOT, OUT_IOS));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
