const fs = require('fs');
const path = require('path');

// Map assets pipeline filenames to manifest expected names
const MAP = [
  { from: 'icon-16.png', to: 'icon16.png' },
  { from: 'icon-48.png', to: 'icon48.png' },
  { from: 'icon-128.png', to: 'icon128.png' },
];

function copyIfExists(src, dest) {
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Synced ${path.basename(src)} -> ${path.relative(process.cwd(), dest)}`);
    }
  } catch (e) {
    console.warn(`Failed to sync ${src} -> ${dest}:`, e.message);
  }
}

function main() {
  const distIcons = path.join(process.cwd(), 'dist', 'icons');
  const assetsIcons = path.join(process.cwd(), 'assets', 'dist', 'icons');
  if (!fs.existsSync(assetsIcons)) {
    // Nothing to do
    return;
  }
  if (!fs.existsSync(distIcons)) fs.mkdirSync(distIcons, { recursive: true });
  for (const { from, to } of MAP) {
    const src = path.join(assetsIcons, from);
    const dest = path.join(distIcons, to);
    copyIfExists(src, dest);
  }
}

main();
