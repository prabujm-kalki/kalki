const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, '../public/models/face');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

files.forEach(file => {
  const url = baseUrl + file;
  const filePath = path.join(modelsDir, file);
  
  https.get(url, (response) => {
    if (response.statusCode === 200) {
      const fileStream = fs.createWriteStream(filePath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        console.log(`Downloaded ${file}`);
        fileStream.close();
      });
    } else {
      console.error(`Failed to download ${file}, status code: ${response.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`Error downloading ${file}: ${err.message}`);
  });
});
