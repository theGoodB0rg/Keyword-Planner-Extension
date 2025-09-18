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

// Ensure directories exist
const dirs = [
  path.join(__dirname, 'public', 'icons'),
  path.join(__dirname, 'dist', 'icons')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Create icons in both public and dist directories
sizes.forEach(size => {
  const base64Data = iconData[size];
  
  // Convert Base64 to binary
  const binaryData = Buffer.from(base64Data, 'base64');
  
  // Save to public/icons
  const publicPath = path.join(__dirname, 'public', 'icons', `icon${size}.png`);
  fs.writeFileSync(publicPath, binaryData);
  console.log(`Created public icon: ${publicPath}`);
  
  // Save to dist/icons
  const distPath = path.join(__dirname, 'dist', 'icons', `icon${size}.png`);
  fs.writeFileSync(distPath, binaryData);
  console.log(`Created dist icon: ${distPath}`);
});

console.log('All icon files have been created successfully!'); 