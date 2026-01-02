require('dotenv').config();
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { generateIdeas } = require('./openai');
const { makeVideo } = require('./video');
const { uploadAndSchedule } = require('./youtube');
const { v4: uuidv4 } = require('uuid');

const OUTPUT = process.env.OUTPUT_DIR || './output';
const TZ = process.env.TIMEZONE || 'Asia/Jakarta';
if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });

async function main() {
  console.log('[start] running daily job:', new Date().toISOString());
  // 1) Generate 3 ideas (title + 2-4 sentence script)
  const ideas = await generateIdeas(3);
  console.log('Generated ideas:', ideas.map(i => i.title));

  // 2) For each idea -> create video assets and render video
  const times = ['09:00','12:00','15:00']; // local times
  const results = [];
  for (let i = 0; i < ideas.length; i++) {
    const idea = ideas[i];
    const id = uuidv4();
    const baseName = `${moment().format('YYYYMMDD')}_${i+1}_${id}`;
    const outputVideo = path.join(OUTPUT, `${baseName}.mp4`);

    console.log(`[video] rendering #${i+1} -> ${outputVideo}`);
    // makeVideo will:
    // - create TTS audio from idea.script
    // - generate images (or pick stock)
    // - compose via ffmpeg to 9:16, max 30s
    await makeVideo({
      title: idea.title,
      script: idea.script,
      output: outputVideo,
      maxDuration: Number(process.env.MAX_DURATION_SECONDS || 30)
    });

    // 3) Upload and schedule
    // Determine publish datetime in UTC using timezone and times[i]
    const today = moment.tz(TZ).startOf('day');
    let publishLocal = moment.tz(`${today.format('YYYY-MM-DD')} ${times[i]}`, 'YYYY-MM-DD HH:mm', TZ);
    // If scheduled time already passed, schedule for next day
    if (publishLocal.isBefore(moment.tz(TZ))) publishLocal = publishLocal.add(1, 'day');

    console.log(`[upload] scheduling for ${publishLocal.format()} (${TZ})`);
    const uploadRes = await uploadAndSchedule({
      filePath: outputVideo,
      title: idea.title,
      description: idea.script,
      publishAt: publishLocal.toDate()
    });

    results.push({
      idea,
      video: outputVideo,
      upload: uploadRes,
      scheduledFor: publishLocal.format()
    });
    // small delay between uploads if needed
    await new Promise(r => setTimeout(r, 2000));
  }

  // Save metadata
  fs.writeFileSync(path.join(OUTPUT, `run_${moment().format('YYYYMMDD_HHmmss')}.json`), JSON.stringify(results, null, 2));
  console.log('[done] all videos processed.');
}

main().catch(err => {
  console.error('fatal error', err);
  process.exit(1);
});
