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

function cleanRebuild() {
  try {
    // 1. Clean up the dist directory
    const distDir = path.join(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      log.info('Cleaning dist directory...');
      fs.rmSync(distDir, { recursive: true, force: true });
    }
    
    // 2. Create dist directory if it doesn't exist
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
      log.info('Created fresh dist directory');
    }
    
    // 3. Run webpack build (simplified version without complex dependencies)
    log.info('Skipping webpack build for troubleshooting...');
    
    // 4. Copy manifest.json, popup.html from the test-extension to dist
    log.info('Copying test extension files to dist...');
    fs.copyFileSync(
      path.join(__dirname, 'test-extension', 'manifest.json'),
      path.join(distDir, 'manifest.json')
    );
    fs.copyFileSync(
      path.join(__dirname, 'test-extension', 'popup.html'),
      path.join(distDir, 'popup.html')
    );
    
    // 5. Create a ZIP file for easy loading
    log.info('Creating ZIP file of the extension...');
    
    // Check if archiver is available
    try {
      require.resolve('archiver');
    } catch (e) {
      log.warning('archiver package not found. Installing...');
      execSync('npm install archiver --save-dev', { stdio: 'inherit' });
      log.success('archiver installed successfully!');
    }
    
    const archiver = require('archiver');
    const output = fs.createWriteStream(path.join(__dirname, 'test-extension.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', function() {
      log.success(`Extension packaged successfully: ${path.join(__dirname, 'test-extension.zip')}`);
      log.success(`Total size: ${archive.pointer()} bytes`);
      
      log.info('\nTo load the extension in Chrome:');
      log.info('1. Open chrome://extensions/');
      log.info('2. Enable "Developer mode" (toggle in top-right)');
      log.info('3. Drag and drop the test-extension.zip file into Chrome');
      log.info('   OR click "Load unpacked" and select the dist folder');
    });
    
    archive.on('error', function(err) {
      throw err;
    });
    
    archive.pipe(output);
    archive.directory(distDir, false);
    archive.finalize();
    
  } catch (error) {
    log.error(`Build failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

cleanRebuild(); 