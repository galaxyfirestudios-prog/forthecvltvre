import { VIDEO_SOURCES } from '../video-sources.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const YOUTUBE_BASE = 'https://www.youtube.com';
const MAX_PER_CHANNEL = Math.min(Math.max(Number(process.env.VIDEO_SCAN_PER_CHANNEL || 15), 1), 15);
const MAX_SAVED = Math.min(Math.max(Number(process.env.VIDEO_MAX_SAVED || 60), 1), 100);
const MAX_AGE_DAYS = Math.min(Math.max(Number(process.env.VIDEO_MAX_AGE_DAYS || 45), 1), 180);
const INCLUDE_SHORTS = String(process.env.VIDEO_INCLUDE_SHORTS || 'false').toLowerCase() === 'true';
const OUT_FILE = new URL('../public/video-feed.json', import.meta.url);
const REQUEST_TIMEOUT_MS = 20_000;
const RETRIES = 2;

const CP1252_TO_BYTE = new Map([
  [0x20AC,0x80],[0x201A,0x82],[0x192,0x83],[0x201E,0x84],[0x2026,0x85],
  [0x2020,0x86],[0x2021,0x87],[0x2C6,0x88],[0x2030,0x89],[0x160,0x8A],
  [0x2039,0x8B],[0x152,0x8C],[0x17D,0x8E],[0x2018,0x91],[0x2019,0x92],
  [0x201C,0x93],[0x201D,0x94],[0x2022,0x95],[0x2013,0x96],[0x2014,0x97],
  [0x2DC,0x98],[0x2122,0x99],[0x161,0x9A],[0x203A,0x9B],[0x153,0x9C],
  [0x17E,0x9E],[0x178,0x9F]
]);

function repairMojibake(value = '') {
  if (!/[ÃÂâð]/.test(value)) return value;
  const bytes = [];
  for (const ch of value) {
    const cp = ch.codePointAt(0);
    if (cp <= 0xFF) bytes.push(cp);
    else if (CP1252_TO_BYTE.has(cp)) bytes.push(CP1252_TO_BYTE.get(cp));
    else return value;
  }
  try {
    const repaired = Buffer.from(bytes).toString('utf8');
    return repaired.includes('\uFFFD') ? value : repaired;
  } catch {
    return value;
  }
}

function decodeXml(value = '') {
  const decoded = value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  return repairMojibake(decoded);
}

function tagText(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? decodeXml(match[1].trim()) : '';
}

function tagAttr(block, tag, attr) {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*\\b${attr}=["']([^"']+)["'][^>]*>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function ageCutoff() {
  return Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function isShort(video) {
  const haystack = `${video.title} ${video.description}`.toLowerCase();
  return /(^|[\s#])#?shorts\b/.test(haystack);
}

function classifyVideo(title, description, source) {
  const text = `${title} ${description}`.toLowerCase();
  const rules = [
    ['MUSIC', /\b(music video|official video|official audio|single|album|ep|afrobeats?|afrobeat|amapiano|hip hop|hip-hop|r&b|dj|remix|freestyle|live performance|concert)\b/],
    ['FILM', /\b(film|movie|cinema|trailer|series|episode|documentary|short film|actor|actress|director)\b/],
    ['STYLE', /\b(fashion|style|beauty|makeup|streetwear|designer|runway|sneaker|lifestyle)\b/],
    ['ART', /\b(artist|art|gallery|photography|creative|visual|design|illustration)\b/],
    ['EVENTS', /\b(event|festival|awards?|red carpet|launch|premiere|party|showcase|summit)\b/],
    ['SPORTS', /\b(sport|football|soccer|basketball|boxing|athletics|premier league|super eagles)\b/],
    ['CULTURE', /\b(culture|heritage|identity|africa|african|nigeria|naija|society|community|interview|conversation|podcast)\b/],
  ];
  for (const [category, pattern] of rules) {
    if (pattern.test(text)) return category;
  }
  return source.categories?.[0] || 'CULTURE';
}

function relevanceScore(video, source) {
  const text = `${video.title} ${video.description}`.toLowerCase();
  let score = Number(source.weight || 10);
  const boosts = [
    [/\b(nigeria|nigerian|naija|lagos|abuja|africa|african|ghana|south africa|johannesburg|cape town)\b/g, 5],
    [/\b(interview|conversation|behind the scenes|exclusive|session|live performance|documentary|originals?)\b/g, 3],
    [/\b(music|culture|fashion|film|art|entertainment|event|creative)\b/g, 2],
  ];
  for (const [pattern, points] of boosts) {
    const matches = text.match(pattern);
    if (matches) score += Math.min(matches.length, 3) * points;
  }
  if (/\b(breaking|politics|election|president|senate|governor)\b/.test(text)) score -= 5;
  if (isShort(video)) score -= 8;
  return score;
}

async function fetchText(url) {
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/html,application/atom+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (compatible; FOR-THE-CULTURE-video-feed/1.0)',
        },
        signal: controller.signal,
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return body;
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('Request failed');
}

async function resolveChannel(source) {
  if (source.channel_id) {
    return {
      channelId: source.channel_id,
      feedUrl: `${YOUTUBE_BASE}/feeds/videos.xml?channel_id=${source.channel_id}`,
    };
  }
  const handle = String(source.handle || '').replace(/^@/, '');
  if (!handle) throw new Error('Missing YouTube handle');
  const pageUrl = `${YOUTUBE_BASE}/@${encodeURIComponent(handle)}`;
  const html = await fetchText(pageUrl);
  const channelMatch = html.match(/"channelId":"(UC[A-Za-z0-9_-]{22})"/i)
    || html.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/i)
    || html.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/i)
    || html.match(/UC[A-Za-z0-9_-]{22}/);
  const channelId = channelMatch?.[1] || channelMatch?.[0];
  if (!channelId) throw new Error(`Could not resolve channel ID for ${source.handle}`);
  return {
    channelId,
    feedUrl: `${YOUTUBE_BASE}/feeds/videos.xml?channel_id=${channelId}`,
  };
}

function parseFeed(xml, source) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  return entries.slice(0, MAX_PER_CHANNEL).map((entry) => {
    const videoId = tagText(entry, 'yt:videoId') || tagText(entry, 'videoId');
    const title = tagText(entry, 'title') || 'Untitled video';
    const description = tagText(entry, 'media:description') || tagText(entry, 'description');
    const publishedAt = tagText(entry, 'published') || tagText(entry, 'updated');
    const thumbnail = tagAttr(entry, 'media:thumbnail', 'url')
      || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');
    const channelName = tagText(entry, 'name') || source.name;
    return {
      video_id: videoId,
      title,
      headline: title,
      description,
      dek: description,
      source_name: channelName || source.name,
      source_url: source.youtube_url || `https://www.youtube.com/${source.handle}`,
      video_url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
      image_url: thumbnail,
      published_at: publishedAt,
      category: classifyVideo(title, description, source),
      media_type: 'video',
      region: source.region,
      relevance_score: relevanceScore({ title, description }, source),
    };
  }).filter((video) => video.video_id && video.video_url && video.published_at);
}

async function fetchChannelVideos(source) {
  const resolved = await resolveChannel(source);
  const xml = await fetchText(resolved.feedUrl);
  const videos = parseFeed(xml, source);
  const cutoff = ageCutoff();
  return videos.filter((video) => {
    if (new Date(video.published_at).getTime() < cutoff) return false;
    if (!INCLUDE_SHORTS && isShort(video)) return false;
    return true;
  });
}

async function loadExistingFeed() {
  try {
    const current = JSON.parse(await readFile(OUT_FILE, 'utf8'));
    return Array.isArray(current?.videos) ? current : null;
  } catch {
    return null;
  }
}

async function main() {
  const results = [];
  const errors = [];
  for (const source of VIDEO_SOURCES) {
    try {
      const videos = await fetchChannelVideos(source);
      results.push(...videos);
      console.log(`${source.name}: ${videos.length} usable videos`);
    } catch (error) {
      errors.push({ source: source.name, error: error?.message || String(error) });
      console.warn(`${source.name}: ${error?.message || error}`);
    }
  }

  const unique = new Map();
  for (const video of results) unique.set(video.video_id, video);

  const videos = [...unique.values()]
    .sort((a, b) => {
      const score = Number(b.relevance_score) - Number(a.relevance_score);
      if (score !== 0) return score;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    })
    .slice(0, MAX_SAVED);

  if (!videos.length) {
    const existing = await loadExistingFeed();
    if (existing?.videos?.length) {
      console.warn('No fresh videos were retrieved. Keeping the existing video feed unchanged.');
      console.warn(`Source errors: ${JSON.stringify(errors)}`);
      return;
    }
    throw new Error(`No usable videos found and no existing feed is available. Source errors: ${JSON.stringify(errors)}`);
  }

  const payload = {
    generated_at: new Date().toISOString(),
    source: 'FOR THE CULTURE YouTube Video Engine (public RSS)',
    count: videos.length,
    videos,
    source_errors: errors,
  };

  await mkdir(new URL('../public/', import.meta.url), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${videos.length} videos to public/video-feed.json`);
  if (errors.length) console.log(`Completed with ${errors.length} source errors.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
