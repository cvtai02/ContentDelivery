type CodexJobMap = Map<string, AbortController>;

declare global {
  // eslint-disable-next-line no-var
  var __codexJobs: CodexJobMap | undefined;
}

function jobs(): CodexJobMap {
  if (!global.__codexJobs) global.__codexJobs = new Map();
  return global.__codexJobs;
}

export function registerCodexJob(jobId?: string): AbortController | null {
  if (!jobId) return null;
  const controller = new AbortController();
  jobs().set(jobId, controller);
  return controller;
}

export function unregisterCodexJob(jobId: string | undefined, controller: AbortController | null) {
  if (!jobId || !controller) return;
  if (jobs().get(jobId) === controller) jobs().delete(jobId);
}

export function cancelCodexJob(jobId: string): boolean {
  const controller = jobs().get(jobId);
  if (!controller) return false;
  controller.abort();
  jobs().delete(jobId);
  return true;
}

export function mergeAbortSignals(...signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const activeSignals = signals.filter((signal): signal is AbortSignal => Boolean(signal));
  if (activeSignals.length === 0) return undefined;
  if (activeSignals.length === 1) return activeSignals[0];

  const controller = new AbortController();
  const abort = () => controller.abort();

  for (const signal of activeSignals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', abort, { once: true });
  }

  return controller.signal;
}
