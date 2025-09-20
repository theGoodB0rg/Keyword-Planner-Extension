const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "assets", "src");
const DIST_DIR = path.join(ROOT, "assets", "dist");
const SRC_LOGO = path.join(SRC_DIR, "logo.svg");
const SRC_LOGO_SMALL = path.join(SRC_DIR, "logo-small.svg");

// Ensure directories exist
async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function exportPng({ width, height, outPath, fit = "contain", background = { r: 0, g: 0, b: 0, alpha: 0 }, src = SRC_LOGO }) {
  await ensureDir(path.dirname(outPath));
  const img = sharp(src).resize(width, height, { fit, background });
  await img.png({ compressionLevel: 9 }).toFile(outPath);
  console.log("✓", path.relative(ROOT, outPath));
}

async function run() {
  // Basic extension icons (Chrome/Firefox/Edge)
  // Use crisper small source for 16/32/48; standard source for 128/256
  for (const s of [16, 32, 48]) {
    await exportPng({
      width: s,
      height: s,
      outPath: path.join(DIST_DIR, "icons", `icon-${s}.png`),
      fit: "cover",
      src: SRC_LOGO_SMALL,
    });
  }
  for (const s of [128, 256]) {
    await exportPng({
      width: s,
      height: s,
      outPath: path.join(DIST_DIR, "icons", `icon-${s}.png`),
      fit: "cover",
      src: SRC_LOGO,
    });
  }

  // Action/toolbar icons (Chrome MV3, Firefox)
  // Toolbar icons prefer small, shadowless source. Consider future transparent bg variant.
  for (const s of [16, 32]) {
    await exportPng({
      width: s,
      height: s,
      outPath: path.join(DIST_DIR, "icons", `toolbar-${s}.png`),
      fit: "cover",
      src: SRC_LOGO_SMALL,
    });
  }

  // Social / Open Graph
  await exportPng({
    width: 1200,
    height: 630,
    outPath: path.join(DIST_DIR, "social", "og-1200x630.png"),
    fit: "cover",
    background: { r: 14, g: 165, b: 233, alpha: 1 }
  });
  await exportPng({
    width: 1080,
    height: 1080,
    outPath: path.join(DIST_DIR, "social", "square-1080.png"),
    fit: "cover",
    background: { r: 14, g: 165, b: 233, alpha: 1 }
  });

  // Chrome Web Store promo tiles (optional but nice)
  await exportPng({
    width: 440,
    height: 280,
    outPath: path.join(DIST_DIR, "store", "cws-promo-small-440x280.png"),
    fit: "cover",
    background: { r: 14, g: 165, b: 233, alpha: 1 }
  });
  await exportPng({
    width: 920,
    height: 680,
    outPath: path.join(DIST_DIR, "store", "cws-promo-large-920x680.png"),
    fit: "cover",
    background: { r: 14, g: 165, b: 233, alpha: 1 }
  });

  // Favicon set for docs or a landing page
  for (const s of [16, 32]) {
    await exportPng({
      width: s,
      height: s,
      outPath: path.join(DIST_DIR, "favicon", `favicon-${s}.png`),
      fit: "cover",
      src: SRC_LOGO_SMALL,
    });
  }
  for (const s of [180, 192, 512]) {
    await exportPng({
      width: s,
      height: s,
      outPath: path.join(DIST_DIR, "favicon", `favicon-${s}.png`),
      fit: "cover",
      src: SRC_LOGO,
    });
  }

  console.log("All assets exported.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});