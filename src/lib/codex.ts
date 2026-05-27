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

function abortError(message: string) {
  return new DOMException(message, 'AbortError');
}

function killChildProcess(child: ReturnType<typeof spawn>) {
  if (!child.pid) {
    child.kill();
    return;
  }

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    return;
  }

  child.kill('SIGTERM');
}

export async function runCodex(prompt: string, cwd: string, timeoutMs = 300_000, signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) throw abortError('Codex cancelled');

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-out-'));
  const outputPath = path.join(tempDir, 'out.txt');
  const { exe, prefix } = codexCommand();
  const args = [...prefix, 'exec', '--skip-git-repo-check', '--ephemeral', '-s', 'read-only', '-C', cwd, '-o', outputPath, prompt];

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(exe, args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;

      function finish(fn: () => void) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        fn();
      }

      function onAbort() {
        killChildProcess(child);
        finish(() => reject(abortError('Codex cancelled')));
      }

      timer = setTimeout(() => {
        killChildProcess(child);
        finish(() => reject(new Error('Codex timed out')));
      }, timeoutMs);

      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
        return;
      }
      child.stdin.end();
      child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
      child.on('error', (err) => { finish(() => reject(err)); });
      child.on('close', (code) => {
        finish(() => {
          if (code === 0) resolve();
          else reject(new Error(`Codex exited ${code}: ${stderr.slice(0, 300)}`));
        });
      });
    });

    const output = (await readFile(outputPath, 'utf8')).trim();
    if (!output) throw new Error('Codex returned no output');
    return output;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
