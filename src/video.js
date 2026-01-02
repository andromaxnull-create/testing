// Compose video: generate images, combine with TTS and overlay text to 9:16
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { ttsToFile } = require('./tts');

async function makeVideo({ title, script, output, maxDuration = 30 }) {
  // 1) Create TTS audio
  const audioPath = output.replace('.mp4', '.mp3');
  await ttsToFile(script, audioPath);

  // 2) Generate or pick visuals
  // For prototype: create a static background (solid color) and overlay text
  const imagePath = output.replace('.mp4', '.png');
  await createTextImage(title, script, imagePath);

  // 3) Compose with ffmpeg: image looped to duration + audio, 9:16 (1080x1920)
  await renderFFmpeg(imagePath, audioPath, output, maxDuration);
  return output;
}

async function createTextImage(title, script, outPath) {
  // Use ImageMagick (convert) or canvas. For simplicity, use ffmpeg drawtext on color source.
  // We'll create a 1080x1920 PNG with background and text using ffmpeg.
  const { execSync } = require('child_process');
  const safeTitle = title.replace(/"/g, '\\"');
  const safeScript = script.replace(/"/g, '\\"');
  const cmd = `ffmpeg -f lavfi -i color=c=black:s=1080x1920 -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf: text='${safeTitle}': fontcolor=white: fontsize=60: x=(w-text_w)/2: y=200, drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf: text='${safeScript}': fontcolor=white: fontsize=40: x=60: y=360: box=1: boxcolor=black@0.5: boxborderw=10" -frames:v 1 "${outPath}" -y`;
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch (e) {
    throw new Error('Failed to create text image: ensure ffmpeg + fonts exist. ' + e.message);
  }
}

function renderFFmpeg(imagePath, audioPath, outPath, maxDuration) {
  return new Promise((resolve, reject) => {
    // Use image as video stream, set fps, set resolution 1080x1920, loop for audio duration or maxDuration
    ffmpeg()
      .addInput(imagePath)
      .loop(maxDuration) // loop image to length
      .addInput(audioPath)
      .outputOptions([
        '-c:v libx264',
        '-pix_fmt yuv420p',
        '-r 30',
        '-vf scale=1080:1920', // ensure 9:16
        `-t ${maxDuration}`,
        '-c:a aac',
        '-b:a 128k'
      ])
      .on('start', cmd => console.log('ffmpeg start:', cmd))
      .on('error', err => reject(err))
      .on('end', () => resolve(outPath))
      .save(outPath);
  });
}

module.exports = { makeVideo };
