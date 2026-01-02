// Upload video and schedule publishAt using googleapis
const fs = require('fs');
const { google } = require('googleapis');

function getOAuthClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET
  );
  oAuth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
  });
  return oAuth2Client;
}

/**
 * uploadAndSchedule({filePath, title, description, publishAt: Date})
 * Returns upload result (videoId, url)
 */
async function uploadAndSchedule({ filePath, title, description, publishAt }) {
  const auth = getOAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const fileSize = fs.statSync(filePath).size;
  // publishAt should be ISO 8601 in RFC3339 with timezone (UTC)
  const publishAtIso = new Date(publishAt).toISOString();

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title.substring(0, 100),
        description: description,
        tags: ['shortstory', 'cerita', 'shorts'],
        categoryId: '22' // People & Blogs (adjust as needed)
      },
      status: {
        privacyStatus: 'private', // keep private then set publishAt
        publishAt: publishAtIso
      }
    },
    media: {
      body: fs.createReadStream(filePath)
    }
  }, {
    // must set higher timeout for big uploads
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  });

  const videoId = res.data.id;
  const url = `https://youtu.be/${videoId}`;
  return { videoId, url, response: res.data };
}

module.exports = { uploadAndSchedule };
