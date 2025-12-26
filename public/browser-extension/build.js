#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🔨 Building QA Test Recorder Extension...')

// Get base URL from environment variable
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const PRODUCTION_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'your-domain.com'

console.log(`📍 Using base URL: ${BASE_URL}`)
console.log(`🌐 Using domain: ${PRODUCTION_DOMAIN}`)

// Check if icons exist
const iconsDir = path.join(__dirname, 'icons')
if (!fs.existsSync(iconsDir) || fs.readdirSync(iconsDir).length === 0) {
  console.log('⚠️  Warning: icons folder is empty or doesn\'t exist')
  console.log('   Creating placeholder icons...')
  fs.mkdirSync(iconsDir, { recursive: true })
  
  // Create simple text file placeholders
  const sizes = [16, 48, 128]
  sizes.forEach(size => {
    fs.writeFileSync(
      path.join(iconsDir, `icon${size}.png`),
      `Placeholder icon ${size}x${size}`
    )
  })
  console.log('   ✅ Created placeholder icon files')
}

// Create build directory
const buildDir = path.join(__dirname, 'build')
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true })
}
fs.mkdirSync(buildDir)

// Copy extension files
console.log('📦 Copying extension files...')
const filesToCopy = [
  'manifest.json',
  'background.js',
  'content.js',
  'injected.js',
  'popup.html',
  'popup.js',
  'url-helper.js'
]

filesToCopy.forEach(file => {
  const source = path.join(__dirname, file)
  const dest = path.join(buildDir, file)
  
  if (fs.existsSync(source)) {
    let content = fs.readFileSync(source, 'utf8')
    
    // Replace __BASE_URL__ placeholder with actual base URL
    content = content.replace(/__BASE_URL__/g, BASE_URL)
    
    // Replace domain placeholder (for domain detection in extension)
    content = content.replace(/your-domain\.com/g, PRODUCTION_DOMAIN)
    
    fs.writeFileSync(dest, content)
  } else {
    console.log(`   ⚠️  Warning: ${file} not found, skipping`)
  }
})

// Copy icons
if (fs.existsSync(iconsDir)) {
  const buildIconsDir = path.join(buildDir, 'icons')
  fs.mkdirSync(buildIconsDir, { recursive: true })
  
  fs.readdirSync(iconsDir).forEach(file => {
    fs.copyFileSync(
      path.join(iconsDir, file),
      path.join(buildIconsDir, file)
    )
  })
}

console.log('📦 Creating ZIP file...')

// Create extensions directory
const extensionsDir = path.join(__dirname, '..', 'extensions')
if (!fs.existsSync(extensionsDir)) {
  fs.mkdirSync(extensionsDir, { recursive: true })
}

const zipPath = path.join(extensionsDir, 'qa-test-recorder-chrome-v1.0.0.zip')

// Try different ZIP methods based on platform
let zipSuccess = false

// Method 1: Try native zip command (macOS/Linux)
try {
  execSync(`cd "${buildDir}" && zip -r "${zipPath}" . -x "*.DS_Store"`, { stdio: 'ignore' })
  zipSuccess = true
  console.log('   ✅ Created ZIP using system zip command')
} catch (e) {
  // zip command not available, try next method
}

// Method 2: Try PowerShell Compress-Archive (Windows)
if (!zipSuccess) {
  try {
    const psCommand = `Compress-Archive -Path "${buildDir}\\*" -DestinationPath "${zipPath}" -Force`
    execSync(`powershell -Command "${psCommand}"`, { stdio: 'ignore' })
    zipSuccess = true
    console.log('   ✅ Created ZIP using PowerShell')
  } catch (e) {
    // PowerShell not available, try next method
  }
}

// Method 3: Try Python (usually available)
if (!zipSuccess) {
  try {
    const pythonScript = `
import zipfile
import os
from pathlib import Path

zip_path = r'${zipPath.replace(/\\/g, '\\\\')}'
build_dir = r'${buildDir.replace(/\\/g, '\\\\')}'

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(build_dir):
        for file in files:
            if file != '.DS_Store':
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, build_dir)
                zipf.write(file_path, arcname)
`
    fs.writeFileSync(path.join(__dirname, 'temp_zip.py'), pythonScript)
    execSync('python3 temp_zip.py', { cwd: __dirname, stdio: 'ignore' })
    fs.unlinkSync(path.join(__dirname, 'temp_zip.py'))
    zipSuccess = true
    console.log('   ✅ Created ZIP using Python')
  } catch (e) {
    // Python not available
  }
}

if (!zipSuccess) {
  console.log('')
  console.log('⚠️  Could not create ZIP automatically')
  console.log('')
  console.log('📋 Manual steps:')
  console.log('1. Navigate to: public/browser-extension/build/')
  console.log('2. Select all files inside (not the folder)')
  console.log('3. Right-click → Compress/Create ZIP')
  console.log('4. Rename to: qa-test-recorder-chrome-v1.0.0.zip')
  console.log('5. Move to: public/extensions/')
  console.log('')
  process.exit(1)
}

// Get file size
const stats = fs.statSync(zipPath)
const fileSizeKB = (stats.size / 1024).toFixed(2)

console.log('')
console.log('✅ Build complete!')
console.log('')
console.log('📦 Package created: qa-test-recorder-chrome-v1.0.0.zip')
console.log(`   Size: ${fileSizeKB} KB`)
console.log(`   Location: public/extensions/`)
console.log('')
console.log('🎯 Ready for download at: /extensions/qa-test-recorder-chrome-v1.0.0.zip')
console.log('')
console.log('Next steps:')
console.log('1. Start your dev server: npm run dev')
console.log('2. Visit: http://localhost:3000/pages/extension')
console.log('3. Click download and install the extension')
console.log('')