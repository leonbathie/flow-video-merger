const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const version = packageJson.version || '1.2.0';
const zipFileName = `flow-video-merger-v${version}.zip`;
const genericZipName = 'flow-video-merger-extension.zip';

const filesToInclude = [
  'manifest.json',
  'background.js',
  'content.js',
  'flow-page-bridge.js',
  'dialog.js',
  'dialog.css',
  'i18n.js',
  'rules.json',
  'sidepanel.html',
  'sidepanel.css',
  'sidepanel.js',
  'smart-order.js',
  'studio.html',
  'studio.css',
  'studio.js',
  'icons',
  'LICENSE',
  'README.md'
];

console.log(`📦 Packaging Flow Video Merger v${version}...`);

let success = false;

// 1. Try tar (available on modern Windows 10/11, macOS, and Linux)
try {
  execSync(`tar -a -c -f "${zipFileName}" ${filesToInclude.join(' ')}`, { stdio: 'pipe' });
  // Also create generic name
  fs.copyFileSync(zipFileName, genericZipName);
  success = true;
  console.log(`✅ Successfully created ${zipFileName} and ${genericZipName} using tar.`);
} catch (e) {
  // 2. Fallback to PowerShell Compress-Archive on Windows
  if (process.platform === 'win32') {
    try {
      execSync(`powershell -NoProfile -Command "Compress-Archive -Path ${filesToInclude.join(',')} -DestinationPath '${zipFileName}' -Force"`, { stdio: 'pipe' });
      fs.copyFileSync(zipFileName, genericZipName);
      success = true;
      console.log(`✅ Successfully created ${zipFileName} using PowerShell.`);
    } catch (err) {
      console.error('❌ Failed to package with PowerShell:', err.message);
    }
  } else {
    // 3. Fallback to zip command on Linux/macOS
    try {
      execSync(`zip -r "${zipFileName}" ${filesToInclude.join(' ')}`, { stdio: 'pipe' });
      fs.copyFileSync(zipFileName, genericZipName);
      success = true;
      console.log(`✅ Successfully created ${zipFileName} using zip.`);
    } catch (err) {
      console.error('❌ Failed to package with zip:', err.message);
    }
  }
}

if (success) {
  const stats = fs.statSync(zipFileName);
  console.log(`🎉 Done! Archive size: ${(stats.size / 1024).toFixed(1)} KB.`);
} else {
  console.error('❌ Could not generate zip archive with available system tools.');
  process.exit(1);
}
