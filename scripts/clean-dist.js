const fs = require('fs');
const path = require('path');
const child = require('child_process');

const distPath = path.join(__dirname, '..', 'dist');

if (fs.existsSync(distPath)) {
  try {
    if (process.platform === 'win32') {
      child.execSync(`rd /s /q "${distPath}"`);
    } else {
      child.execSync(`rm -rf "${distPath}"`);
    }
    console.log(`Removed ${distPath}`);
  } catch (err) {
    console.error('Failed to remove dist folder:', err.message || err);
    process.exit(1);
  }
} else {
  // nothing to do
}
