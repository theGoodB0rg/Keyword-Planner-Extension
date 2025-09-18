const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Check if archiver is installed
try {
  require.resolve('archiver');
} catch (e) {
  console.log('archiver package not found. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install archiver --save-dev', { stdio: 'inherit' });
  console.log('archiver installed successfully!');
}

function packageExtension() {
  const distDir = path.join(__dirname, 'dist');
  const outputFile = path.join(__dirname, 'extension.zip');
  
  // Check if dist directory exists
  if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory does not exist');
    return false;
  }
  
  // Create a file to stream archive data to
  const output = fs.createWriteStream(outputFile);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });
  
  // Listen for all archive data to be written
  output.on('close', function() {
    console.log(`Extension packaged successfully: ${outputFile}`);
    console.log(`Total size: ${archive.pointer()} bytes`);
    console.log('\nYou can now load this extension in Chrome by:');
    console.log('1. Opening chrome://extensions/');
    console.log('2. Enabling "Developer mode"');
    console.log('3. Drag and drop the extension.zip file into the extensions page');
  });
  
  // Good practice to catch warnings
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      console.warn(err);
    } else {
      throw err;
    }
  });
  
  // Handle errors
  archive.on('error', function(err) {
    throw err;
  });
  
  // Pipe archive data to the file
  archive.pipe(output);
  
  // Add all files from dist directory
  archive.directory(distDir, false);
  
  // Finalize the archive
  archive.finalize();
  
  return true;
}

packageExtension(); 