import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const distPath = path.join(__dirname, '..', 'dist');

if (fs.existsSync(distPath)) {
  try {
    if (process.platform === 'win32') {
      execSync(`rd /s /q "${distPath}"`);
    } else {
      execSync(`rm -rf "${distPath}"`);
    }
    console.log(`Removed ${distPath}`);
  } catch (err: any) {
    console.error('Failed to remove dist folder:', err.message || err);
    process.exit(1);
  }
} else {
  // nothing to do
}
