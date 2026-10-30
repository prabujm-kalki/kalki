import fs from 'fs';
import path from 'path';

const srcDir = path.resolve(process.cwd(), 'node_modules/@vladmandic/face-api/model');
const targetDir = path.resolve(process.cwd(), 'public/models/face');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const requiredFiles = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
  'face_landmark_68_tiny_model-weights_manifest.json',
  'face_landmark_68_tiny_model.bin'
];

console.log('Synchronizing face detection and recognition models...');

for (const file of requiredFiles) {
  const src = path.join(srcDir, file);
  const dst = path.join(targetDir, file);
  if (!fs.existsSync(src)) {
    console.error(`Source model missing: ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, dst);
  const stat = fs.statSync(dst);
  console.log(`[OK] ${file} -> ${(stat.size / 1024).toFixed(1)} KB`);
}

console.log('All face models deployed to public/models/face successfully.');
