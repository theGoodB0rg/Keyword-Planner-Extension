/**
 * Simple build script for the extension
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Console logging helpers
const log = {
  info: (msg) => console.log(`${colors.cyan}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`)
};

// Create simple placeholder icons if they don't exist
function createPlaceholderIcons() {
  const iconDir = path.join(__dirname, 'public', 'icons');
  const sizes = [16, 48, 128];
  
  // Ensure the directory exists
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
  }
  
  // Create a simple placeholder icon file for each size
  sizes.forEach(size => {
    const iconPath = path.join(iconDir, `icon${size}.png`);
    if (!fs.existsSync(iconPath)) {
      log.info(`Creating placeholder icon at ${iconPath}`);
      
      // If available, copy from a template, otherwise create an empty file
      try {
        const placeholderPath = path.join(__dirname, 'src', 'assets', `placeholder-${size}.png`);
        if (fs.existsSync(placeholderPath)) {
          fs.copyFileSync(placeholderPath, iconPath);
        } else {
          // Create an empty file as a placeholder
          fs.writeFileSync(iconPath, '');
          log.warning(`Created empty file for icon${size}.png - replace with a real icon`);
        }
      } catch (error) {
        log.error(`Error creating icon${size}.png: ${error.message}`);
      }
    }
  });
}

// Clean the dist directory
function cleanDist() {
  const distDir = path.join(__dirname, 'dist');
  if (fs.existsSync(distDir)) {
    log.info('Cleaning dist directory...');
    fs.rmSync(distDir, { recursive: true, force: true });
  }
}

// Run the build
function build() {
  try {
    log.info('Starting build process...');
    
    // Ensure we have placeholder icons
    createPlaceholderIcons();
    
    // Clean dist directory
    cleanDist();
    
    // Run webpack build
    log.info('Running webpack build...');
    execSync('npm run build', { stdio: 'inherit' });
    
    log.success('Build completed successfully!');
    log.info('Load the extension from the dist/ directory in Chrome');
  } catch (error) {
    log.error(`Build failed: ${error.message}`);
    process.exit(1);
  }
}

// Execute the build
build(); 