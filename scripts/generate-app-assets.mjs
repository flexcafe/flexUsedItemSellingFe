import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "assets", "images", "flex-used-market-logo-source.png");
const OUT_DIR = path.join(ROOT, "assets", "images");

const OUT = {
  icon: path.join(OUT_DIR, "icon.png"), // iOS + general
  adaptiveForeground: path.join(OUT_DIR, "android-icon-foreground.png"), // Android adaptive
  splashIcon: path.join(OUT_DIR, "splash-icon.png"),
  splash: path.join(OUT_DIR, "splash.png"),
  favicon: path.join(OUT_DIR, "favicon.png"),
};

async function ensureSrc() {
  try {
    await fs.access(SRC);
  } catch {
    throw new Error(`Missing source logo at: ${SRC}`);
  }
}

async function main() {
  await ensureSrc();

  const image = sharp(SRC, { failOn: "none" }).rotate(); // respect EXIF orientation if any

  // We always preserve aspect ratio and avoid stretching.
  // "cover" => fills square completely; may crop edges slightly (preferred for app icons).
  await image
    .clone()
    .resize(1024, 1024, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(OUT.icon);

  // Android adaptive foreground: keep it generous but with safe margins.
  // We generate a 1024x1024 foreground where the artwork sits inside ~86% of the canvas.
  const fgSize = 1024;
  const safe = Math.round(fgSize * 0.86);
  const pad = Math.floor((fgSize - safe) / 2);
  const fgBuffer = await image
    .clone()
    .resize(safe, safe, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await sharp({
    create: {
      width: fgSize,
      height: fgSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fgBuffer, left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toFile(OUT.adaptiveForeground);

  // Splash icon (legacy): keep it a bit smaller so it has breathing room.
  await image
    .clone()
    .resize(600, 600, { fit: "contain" })
    .extend({
      top: 212,
      bottom: 212,
      left: 212,
      right: 212,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }) // 1024x1024
    .png({ compressionLevel: 9 })
    .toFile(OUT.splashIcon);

  // Full-bleed splash (more premium): soft warm gradient + vignette + sharpened logo.
  const splashSize = 2048;
  const base = await image
    .clone()
    .resize(splashSize, splashSize, { fit: "cover", position: "centre" })
    .modulate({ brightness: 1.02, saturation: 1.06 })
    .toBuffer();

  const vignetteSvg = Buffer.from(`
    <svg width="${splashSize}" height="${splashSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stop-color="#FFF7ED" stop-opacity="0"/>
          <stop offset="55%" stop-color="#FFF7ED" stop-opacity="0.10"/>
          <stop offset="100%" stop-color="#7A4B0D" stop-opacity="0.18"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#g)"/>
    </svg>
  `);

  const highlightSvg = Buffer.from(`
    <svg width="${splashSize}" height="${splashSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="h" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#F7D26B" stop-opacity="0.22"/>
          <stop offset="70%" stop-color="#F7D26B" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#F7D26B" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#h)"/>
    </svg>
  `);

  await sharp(base)
    .composite([
      { input: highlightSvg, blend: "soft-light" },
      { input: vignetteSvg, blend: "multiply" },
    ])
    .sharpen({ sigma: 0.6, m1: 0.9, m2: 1.8 })
    .png({ compressionLevel: 9 })
    .toFile(OUT.splash);

  // Favicon: 48x48, cover to avoid tiny look.
  await image
    .clone()
    .resize(48, 48, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(OUT.favicon);


  console.log("Generated assets:", OUT);
}

main().catch((err) => {

  console.error(err);
  process.exit(1);
});

