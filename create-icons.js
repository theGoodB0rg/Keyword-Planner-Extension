const fs = require('fs');
const path = require('path');

// Base64 encoded 1x1 pixel PNG files with different colors
const BLUE_PIXEL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==';
const RED_PIXEL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const GREEN_PIXEL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==';

// Create directory if it doesn't exist
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`Created directory: ${directory}`);
  }
}

// Save a base64 PNG to a file
function saveBase64ToPng(base64Data, filePath) {
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(filePath, buffer);
  console.log(`Created icon: ${filePath}`);
}

// Ensure directories exist
const publicIconsDir = path.join(__dirname, 'public', 'icons');
ensureDirectoryExists(publicIconsDir);

// Create icon files with different colors for different sizes
const iconSizes = [16, 48, 128];
const iconColors = [BLUE_PIXEL_PNG, GREEN_PIXEL_PNG, RED_PIXEL_PNG];

iconSizes.forEach((size, index) => {
  const color = iconColors[index % iconColors.length];
  
  // Save to public/icons (webpack copies to dist)
  const publicPath = path.join(publicIconsDir, `icon${size}.png`);
  saveBase64ToPng(color, publicPath);
});

console.log('All icon files have been created successfully!'); 