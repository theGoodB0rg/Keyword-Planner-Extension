const fs = require('fs');
const path = require('path');

// Sizes for Chrome extension icons
const sizes = [16, 48, 128];

// Simple 1x1 pixel PNG data (Base64 encoded) with different colors for each size
const iconData = {
  16: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEklEQVQ4y2NgGAWjYBSMAggAAAQQAAF/TXiOAAAAAElFTkSuQmCC',  // Red icon
  48: 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAEklEQVRoge3BMQEAAADCoPVP7WEIoAAAeA8WQgABnQCJZgAAAABJRU5ErkJggg==',  // Blue icon
  128: 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAEklEQVR4nO3BMQEAAADCoPVP7WkIoAAAeA8WQgABnQCdIgAAAABJRU5ErkJggg=='   // Green icon
};

// Ensure directory exists (source of truth)
const publicIconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(publicIconsDir)) {
  fs.mkdirSync(publicIconsDir, { recursive: true });
  console.log(`Created directory: ${publicIconsDir}`);
}

// Create icons in both public and dist directories
sizes.forEach(size => {
  const base64Data = iconData[size];
  
  // Convert Base64 to binary
  const binaryData = Buffer.from(base64Data, 'base64');
  
  // Save to public/icons (webpack copies to dist/icons)
  const publicPath = path.join(publicIconsDir, `icon${size}.png`);
  fs.writeFileSync(publicPath, binaryData);
  console.log(`Created public icon: ${publicPath}`);
});

console.log('All icon files have been created successfully!'); 