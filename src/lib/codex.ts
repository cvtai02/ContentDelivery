import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

function codexCommand() {
  const appData = process.env.APPDATA ?? path.join(process.env.USERPROFILE ?? '', 'AppData', 'Roaming');
  const codexJs = path.join(appData, 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js');

  if (process.platform === 'win32' && existsSync(codexJs)) {
    return { exe: process.execPath, prefix: [codexJs] };
  }
  return { exe: 'codex', prefix: [] };
}

export async function runCodex(prompt: string, cwd: string, timeoutMs = 120_000): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-out-'));
  const outputPath = path.join(tempDir, 'out.txt');
  const { exe, prefix } = codexCommand();
  const args = [...prefix, 'exec', '--skip-git-repo-check', '--ephemeral', '-s', 'read-only', '-C', cwd, '-o', outputPath, prompt];

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(exe, args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      const timer = setTimeout(() => { child.kill(); reject(new Error('Codex timed out')); }, timeoutMs);
      child.stdin.end();
      child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
      child.on('error', (err) => { clearTimeout(timer); reject(err); });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`Codex exited ${code}: ${stderr.slice(0, 300)}`));
      });
    });

    const output = (await readFile(outputPath, 'utf8')).trim();
    if (!output) throw new Error('Codex returned no output');
    return output;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
