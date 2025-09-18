const fs = require('fs');
const path = require('path');

function verifyExtension() {
  const distDir = path.join(__dirname, 'dist');
  
  // Check if dist directory exists
  if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory does not exist');
    return false;
  }
  
  // Required files
  const requiredFiles = [
    'manifest.json',
    'popup.html',
    'popup.js',
    'background.js',
    'contentScript.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png'
  ];
  
  let success = true;
  
  // Check each required file
  for (const file of requiredFiles) {
    const filePath = path.join(distDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: Required file missing: ${file}`);
      success = false;
    } else {
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        console.error(`Error: File exists but is empty: ${file}`);
        success = false;
      } else {
        console.log(`✓ Found file: ${file} (${stats.size} bytes)`);
      }
    }
  }
  
  // Verify manifest.json content
  try {
    const manifestPath = path.join(distDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check required manifest fields
    const requiredFields = [
      'manifest_version', 
      'name', 
      'version', 
      'description', 
      'background',
      'action',
      'icons'
    ];
    
    for (const field of requiredFields) {
      if (!manifest[field]) {
        console.error(`Error: manifest.json is missing required field: ${field}`);
        success = false;
      }
    }
    
    console.log('✓ manifest.json contains all required fields');
  } catch (err) {
    console.error(`Error reading or parsing manifest.json: ${err.message}`);
    success = false;
  }
  
  if (success) {
    console.log('\n✅ Extension verification completed successfully!');
    console.log('You can now load the extension in Chrome by:');
    console.log('1. Opening chrome://extensions/');
    console.log('2. Enabling "Developer mode"');
    console.log('3. Clicking "Load unpacked" and selecting the dist folder');
  } else {
    console.log('\n❌ Extension verification failed. Please fix the issues above.');
  }
  
  return success;
}

verifyExtension(); 