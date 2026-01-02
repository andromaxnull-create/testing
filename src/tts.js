// Minimal wrapper: produces an audio file (MP3) from text.
// Example: implement with Google Cloud TTS or any provider.
// Here we'll use a placeholder that writes TTS via 'say' fallback or a TODO.
const fs = require('fs');
const path = require('path');

async function ttsToFile(text, outPath) {
  // TODO: replace with real TTS (Google Cloud TTS / ElevenLabs)
  // For prototype, write a short silent audio or require user to supply TTS provider.
  // To keep this file small, we'll create a 1-second silent mp3 when provider missing.
  const noProvider = !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.TTS_API_KEY;
  if (noProvider) {
    // create silent audio via ffmpeg command (requires ffmpeg installed)
    const { execSync } = require('child_process');
    execSync(`ffmpeg -f lavfi -i anullsrc=r=24000:cl=mono -t 1 -q:a 9 -acodec libmp3lame "${outPath}" -y`);
    return outPath;
  }

  // Implement real provider call here...
  throw new Error('TTS provider not configured. Implement ttsToFile using Google/ElevenLabs etc.');
}

module.exports = { ttsToFile };
