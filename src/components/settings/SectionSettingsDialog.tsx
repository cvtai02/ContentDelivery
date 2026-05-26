'use client';

import { useEffect, useState } from 'react';
import type { PromptKey } from '@/lib/codex-prompts';

type Target = { id: string; name: string };

type PromptEntry = { key: PromptKey; label: string };
const EMPTY_PROMPT_ENTRIES: PromptEntry[] = [];

const SECTION_PROMPTS: Record<string, PromptEntry[]> = {
  reddit:    [{ key: 'reddit',    label: 'Compose Prompt' }],
  workplace: [{ key: 'workplace', label: 'Compose Prompt' }],
  zhihu:     [{ key: 'zhihu',    label: 'Compose Prompt' }],
};

async function postJson(url: string, body: object) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error ?? `Request failed: ${res.status}`);
  }
}

export function SectionSettingsDialog({ section, label, onClose }: { section: string; label: string; onClose: () => void }) {
  const promptEntries = SECTION_PROMPTS[section] ?? EMPTY_PROMPT_ENTRIES;

  const [targets, setTargets] = useState<Target[]>([]);
  const [currentTargetId, setCurrentTargetId] = useState<string>('');
  const [selected, setSelected] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // prompt state: key → current textarea value
  const [promptValues, setPromptValues] = useState<Record<string, string>>({});
  const [defaultPrompts, setDefaultPrompts] = useState<Record<string, string>>({});
  const [savedPrompts, setSavedPrompts] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetches: Promise<unknown>[] = [
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/section-settings').then((r) => r.json()),
    ];
    if (promptEntries.length > 0) {
      fetches.push(fetch('/api/prompts').then((r) => r.json()));
    }

    Promise.all(fetches).then((results) => {
      const [appSettings, sectionSettings, promptData] = results as [
        { targets: Target[] },
        Record<string, { facebookTargetId: string | null }>,
        { prompts: Record<string, string>; defaults: Record<string, string> } | undefined,
      ];

      setTargets(appSettings.targets ?? []);
      const override = sectionSettings[section]?.facebookTargetId ?? null;
      setCurrentTargetId(override ?? '');
      setSelected(override ?? '');

      if (promptData) {
        const vals: Record<string, string> = {};
        for (const { key } of promptEntries) vals[key] = promptData.prompts[key] ?? '';
        setPromptValues(vals);
        setSavedPrompts(vals);
        setDefaultPrompts(promptData.defaults ?? {});
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  }, [section, promptEntries]);

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const jobs: Promise<unknown>[] = [];

      // Save Facebook target
      jobs.push(
        postJson('/api/section-settings', { section, facebookTargetId: selected || null }),
      );

      // Save any changed prompts
      for (const { key } of promptEntries) {
        const val = promptValues[key] ?? '';
        const isDefault = val === defaultPrompts[key];
        jobs.push(
          postJson('/api/prompts', { key, template: isDefault ? null : val }),
        );
      }

      await Promise.all(jobs);
      setCurrentTargetId(selected);
      setSavedPrompts({ ...promptValues });
      setMessage('Đã lưu.');
    } catch {
      setMessage('Lỗi khi lưu.');
    } finally {
      setSaving(false);
    }
  }

  const isDirty =
    selected !== currentTargetId ||
    promptEntries.some(({ key }) => promptValues[key] !== savedPrompts[key]);

  const defaultTarget = targets[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-panel p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary">{label} — Settings</h2>
          <button onClick={onClose} className="text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none">✕</button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-10 animate-pulse rounded-xl bg-surface" />
            {promptEntries.map(({ key }) => (
              <div key={key} className="h-32 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Facebook Target */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted">Facebook Target</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full rounded-xl border border-divider bg-surface px-3 py-2 text-xs text-primary outline-none focus:border-accent"
              >
                <option value="">App Default{defaultTarget ? ` (${defaultTarget.name})` : ''}</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Prompt fields */}
            {promptEntries.map(({ key, label: promptLabel }) => (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted">{promptLabel}</label>
                  {promptValues[key] !== defaultPrompts[key] && (
                    <button
                      onClick={() => setPromptValues((v) => ({ ...v, [key]: defaultPrompts[key] }))}
                      className="text-xs text-muted hover:text-primary bg-transparent border-none cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <textarea
                  value={promptValues[key] ?? ''}
                  onChange={(e) => setPromptValues((v) => ({ ...v, [key]: e.target.value }))}
                  rows={7}
                  spellCheck={false}
                  className="w-full rounded-xl border border-divider bg-surface px-3 py-2 text-xs text-primary font-mono outline-none focus:border-accent resize-y"
                />
                <p className="text-xs text-muted">
                  Use <code className="bg-surface px-1 rounded">{'{{content}}'}</code> where the article content is inserted.
                </p>
              </div>
            ))}

            {message && <p className="text-xs text-accent">{message}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent"
              >
                Đóng
              </button>
              <button
                onClick={save}
                disabled={saving || !isDirty}
                className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
