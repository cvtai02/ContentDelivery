import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'src', 'data', 'today-post.json');
const force = process.argv.includes('--force');
const avoidTopicArg = process.argv.find((arg) => arg.startsWith('--avoid-topic='));
const avoidTopic = avoidTopicArg ? avoidTopicArg.slice('--avoid-topic='.length).trim() : '';
const providerArg = process.argv.find((arg) => arg.startsWith('--provider='));
const provider = providerArg?.slice('--provider='.length) === 'claude' ? 'claude' : 'codex';
const locationArg = process.argv.find((arg) => arg.startsWith('--location='));
const location = locationArg?.slice('--location='.length) ?? 'vietnam';

function todayInBangkok() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function readExistingPost() {
  if (!existsSync(outputPath)) return null;

  try {
    return JSON.parse(await readFile(outputPath, 'utf8'));
  } catch {
    return null;
  }
}

function locationConstraint() {
  if (location === 'asia') return 'The destination must be in Asia (can include Vietnam).';
  if (location === 'world') return 'The destination can be anywhere in the world.';
  return 'The destination must be in Vietnam.';
}

function buildPrompt(date, source) {
  const prompt = [
    'Act as a plain text completion API, not as a coding assistant.',
    'Pick one real travel destination for a Vietnamese daily travel post.',
    locationConstraint(),
    `Date: ${date} in Asia/Bangkok.`,
    avoidTopic ? `Pick a meaningfully different destination from: "${avoidTopic}".` : '',
    'Only generate content. Do not edit files. Do not ask for permission.',
    'Return JSON only. Do not wrap it in markdown fences. Do not include commentary.',
    'Schema:',
    '{',
    '  "date": "YYYY-MM-DD",',
    '  "topic": "Destination name, Region/Country in Vietnamese (e.g. Hội An, Quảng Nam)",',
    '  "title": "A short, punchy Vietnamese hook title that makes readers want to visit — max 10 words",',
    '  "excerpt": "1 Vietnamese sentence capturing the soul of this destination",',
    '  "body": ["1–2 sentences: what makes this place special", "1–2 sentences: top things to do or see", "1–2 sentences: quick practical tips"],',
    '  "tags": ["tag1", "tag2", "tag3", "tag4"],',
    '  "callToAction": "One short Vietnamese question inviting readers to share or plan a trip",',
    '  "imagePrompt": "[iconic landscape or landmark of the destination], [2-3 visual details], flat editorial illustration, [warm|cool|vibrant|dark] tones, minimal composition, no text, no faces",',
    '  "generatedAt": "ISO datetime",',
    `  "source": "${source}"`,
    '}',
    'Write like a pragmatic person, not a poet. No flowery language, no clichés, no "thiên đường", no "tuyệt vời". Just clear, direct, factual sentences. Title should be a plain hook that states a fact or asks a real question.',
  ];

  return prompt.filter(Boolean).join('\n');
}

function cleanValue(value) {
  return value
    .replace(/^["'*_`]+|["'*_`]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchField(text, label) {
  const re = new RegExp(`(?:\\*\\*)?${label}(?:\\*\\*)?\\s*:?\\s*(.+)`, 'i');
  return cleanValue(text.match(re)?.[1] ?? '');
}

function extractLoosePost(text, date) {
  const topic = matchField(text, 'Topic');
  const title = matchField(text, 'Title');
  const excerpt = matchField(text, 'Excerpt');
  const callToAction = matchField(text, 'CTA|Call to Action|CallToAction');

  const bodySection = text
    .split(/\*\*Body:\*\*|Body:/i)[1]
    ?.split(/\*\*Tags:\*\*|Tags:|\*\*CTA:\*\*|CTA:|\*\*Call to Action:\*\*|Call to Action:/i)[0] ?? '';
  const body = [...bodySection.matchAll(/(?:^|\n)\s*\d+\.\s*(.+?)(?=\n\s*\d+\.|\n\s*\*\*|$)/gs)]
    .map((match) => cleanValue(match[1]))
    .filter(Boolean);

  const tagsLine = matchField(text, 'Tags');
  const tags = tagsLine
    ? tagsLine.split(/[,#` ]+/).map(cleanValue).filter(Boolean).slice(0, 5)
    : ['TodayPost'];

  if (!topic || !title || !excerpt || body.length < 2) {
    return null;
  }

  return {
    date,
    topic,
    title,
    excerpt,
    body,
    tags,
    callToAction: callToAction || 'Bạn sẽ thử áp dụng điều này như thế nào hôm nay?',
    imagePrompt: `${topic}, simple objects related to the theme, flat editorial illustration, warm tones, minimal composition, no text, no faces`,
    generatedAt: new Date().toISOString(),
    source: provider,
  };
}

function extractJson(text, date) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    const loosePost = extractLoosePost(cleaned, date);
    if (loosePost) return loosePost;

    const excerpt = cleaned.slice(0, 500) || '[empty response]';
    throw new Error(`Claude CLI response did not contain a JSON object. Response excerpt: ${excerpt}`);
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    const loosePost = extractLoosePost(cleaned, date);
    if (loosePost) return loosePost;

    const excerpt = cleaned.slice(0, 500) || '[empty response]';
    throw new Error(`CLI response contained invalid JSON. Response excerpt: ${excerpt}`);
  }
}

function validatePost(post, date) {
  const requiredStrings = ['date', 'topic', 'title', 'excerpt', 'callToAction', 'generatedAt', 'source'];
  for (const key of requiredStrings) {
    if (typeof post[key] !== 'string' || !post[key].trim()) {
      throw new Error(`Missing or invalid field: ${key}`);
    }
  }
  if (post.date !== date) {
    post.date = date;
  }
  if (!Array.isArray(post.body) || post.body.length < 2) {
    throw new Error('Missing or invalid field: body');
  }
  if (!Array.isArray(post.tags) || post.tags.length === 0) {
    post.tags = ['TodayPost'];
  }
  if (typeof post.imagePrompt !== 'string' || !post.imagePrompt.trim()) {
    post.imagePrompt = `${post.topic}, simple objects related to the theme, flat editorial illustration, warm tones, minimal composition, no text, no faces`;
  }
  post.source = provider;
  return post;
}

function codexInvocation(prompt, outputPath) {
  const codexJs = path.join(
    process.env.APPDATA ?? path.join(process.env.USERPROFILE ?? '', 'AppData', 'Roaming'),
    'npm',
    'node_modules',
    '@openai',
    'codex',
    'bin',
    'codex.js',
  );

  if (process.platform === 'win32' && existsSync(codexJs)) {
    return {
      command: process.execPath,
      args: [
        codexJs,
        'exec',
        '--skip-git-repo-check',
        '--ephemeral',
        '-s',
        'read-only',
        '-C',
        root,
        '-o',
        outputPath,
        prompt,
      ],
    };
  }

  return {
    command: 'codex',
    args: [
      'exec',
      '--skip-git-repo-check',
      '--ephemeral',
      '-s',
      'read-only',
      '-C',
      root,
      '-o',
      outputPath,
      prompt,
    ],
  };
}

async function askCodex(prompt) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'today-post-codex-'));
  const outputPath = path.join(tempDir, 'last-message.txt');
  const invocation = codexInvocation(prompt, outputPath);

  try {
    await runWithClosedStdin(
      invocation.command,
      invocation.args,
      {
        cwd: root,
        timeout: 140_000,
        windowsHide: true,
      },
    );

    const output = (await readFile(outputPath, 'utf8')).trim();
    if (!output) {
      throw new Error('Codex CLI returned no output. Run "codex login" or open Codex once in terminal to verify it is logged in.');
    }

    return output;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function runWithClosedStdin(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: options.windowsHide,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Command timed out after ${options.timeout}ms`));
    }, options.timeout);

    child.stdin.end();
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`Command failed with exit code ${code}: ${stderr || stdout}`));
    });
  });
}

function claudeInvocation(prompt) {
  const args = [
    '-p',
    prompt,
    '--output-format',
    'text',
    '--no-session-persistence',
    '--permission-mode',
    'dontAsk',
    '--disallowedTools',
    'Read,Write,Edit,MultiEdit,Bash,Glob,Grep,LS,NotebookRead,NotebookEdit,WebFetch,WebSearch',
    '--system-prompt',
    'You are a plain text content generator. Do not use tools, do not edit files, do not ask permission, and do not describe a plan. Return only the requested JSON.',
  ];

  if (process.platform === 'win32') {
    const claudeExe = path.join(
      process.env.APPDATA ?? path.join(process.env.USERPROFILE ?? '', 'AppData', 'Roaming'),
      'npm',
      'node_modules',
      '@anthropic-ai',
      'claude-code',
      'bin',
      'claude.exe',
    );

    return {
      command: existsSync(claudeExe) ? claudeExe : 'claude',
      args,
    };
  }

  return {
    command: 'claude',
    args,
  };
}

async function askClaude(prompt) {
  const invocation = claudeInvocation(prompt);
  const { stdout, stderr } = await execFileAsync(
    invocation.command,
    invocation.args,
    {
      cwd: root,
      timeout: 140_000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    },
  );

  const output = stdout.trim();
  if (!output) {
    const detail = stderr.trim();
    throw new Error(
      detail
        ? `Claude CLI returned no output: ${detail}`
        : 'Claude CLI returned no output. Run "claude auth" or open Claude Code once in terminal to verify it is logged in.',
    );
  }

  return output;
}

async function fetchWikipediaImage(topic) {
  const destination = topic.split(',')[0].trim();
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(destination)}`,
      { headers: { 'User-Agent': 'MyNews/1.0 (https://github.com/cvtai105)' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.originalimage?.source ?? data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const date = todayInBangkok();
  const existing = await readExistingPost();

  if (!force && existing?.date === date && existing?.source === provider) {
    console.log(`Today Post already exists for ${date}. Use --force to regenerate.`);
    return;
  }

  const prompt = buildPrompt(date, provider);
  const answer = provider === 'claude'
    ? await askClaude(prompt)
    : await askCodex(prompt);
  const post = validatePost(extractJson(answer, date), date);

  console.log(`Fetching Wikipedia image for: ${post.topic}`);
  const imageUrl = await fetchWikipediaImage(post.topic);
  if (imageUrl) {
    post.imageUrl = imageUrl;
    console.log(`  Image: ${imageUrl}`);
  } else {
    console.log('  No Wikipedia image found, will use SVG illustration.');
  }

  await writeFile(outputPath, `${JSON.stringify(post, null, 2)}\n`, 'utf8');
  console.log(`Saved Today Post for ${date} to ${path.relative(root, outputPath)}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
