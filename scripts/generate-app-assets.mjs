import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "assets", "images", "flex-used-market-logo-source.png");
const OUT_DIR = path.join(ROOT, "assets", "images");

const OUT = {
  icon: path.join(OUT_DIR, "icon.png"), // iOS + general
  adaptiveForeground: path.join(OUT_DIR, "android-icon-foreground.png"), // Android adaptive
  splash: path.join(OUT_DIR, "splash-icon.png"),
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

  // Splash icon: same artwork, but we keep it a bit smaller so it has breathing room.
  await image
    .clone()
    .resize(600, 600, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 212,
      bottom: 212,
      left: 212,
      right: 212,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }) // 1024x1024
    .png({ compressionLevel: 9 })
    .toFile(OUT.splash);

  // Favicon: 48x48, cover to avoid tiny look.
  await image
    .clone()
    .resize(48, 48, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(OUT.favicon);

  // eslint-disable-next-line no-console
  console.log("Generated assets:", OUT);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

