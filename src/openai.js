// Generates N short story ideas and short scripts using OpenAI (or fallback)
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateIdeas(n = 3) {
  if (!process.env.OPENAI_API_KEY) {
    // fallback simple ideas
    return Array.from({length: n}).map((_,i) => ({
      title: `Cerita Singkat #${i+1}`,
      script: `Ini adalah cerita singkat bermakna nomor ${i+1}. Inti ceritanya: kebaikan kecil membawa dampak besar. (Durasi ~20 detik)`
    }));
  }

  const prompt = `Buat ${n} ide cerita pendek yang bermakna untuk video vertikal 9:16 dengan durasi maksimal 30 detik.
Untuk setiap ide, berikan:
- title: singkat (<=6 kata)
- script: narasi 1-3 kalimat yang bisa dibacakan dalam <=30 detik
Jangan sertakan nomor. Format JSON array.`;

  const resp = await client.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
    max_tokens: 500
  });

  // Attempt to parse JSON from response
  const text = resp.output_text || resp.output?.[0]?.content?.[0]?.text || JSON.stringify(resp);
  try {
    const parsed = JSON.parse(text);
    return parsed.map(item => ({ title: item.title, script: item.script }));
  } catch (e) {
    // fallback simple parse line-by-line
    return [
      { title: 'Kebaikan Kecil', script: 'Seorang memberi secangkir teh; hari seseorang berubah.' },
      { title: 'Surat Terakhir', script: 'Surat yang tak sempat dikirim menghubungkan dua hati.' },
      { title: 'Langkah Baru', script: 'Berani mulai membuat hidup berbeda, selangkah demi selangkah.' }
    ].slice(0, n);
  }
}

module.exports = { generateIdeas };
