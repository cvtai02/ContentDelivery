'use client';

import { useEffect, useState } from 'react';
import type { PromptKey } from '@/lib/codex-prompts';

type Target = { id: string; name: string };
type ZhihuTopicSettings = { topicCookie: string; xZse93: string; xZse96: string };
type SectionPreferences = { redditDefaultPostLimit: number; zhihuTopicDefaultPostLimit: number };

type PromptEntry = { key: PromptKey; label: string };
const EMPTY_PROMPT_ENTRIES: PromptEntry[] = [];

const SECTION_PROMPTS: Record<string, PromptEntry[]> = {
  reddit: [{ key: 'reddit', label: 'Vietnamese Prompt' }],
  zhihu: [{ key: 'zhihuVietnamese', label: 'Vietnamese Prompt' }],
};

async function postJson<T = void>(url: string, body: object): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null) as (T & { error?: string }) | null;
  if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
  return data as T;
}

function defaultLimitForSection(section: string, prefs: SectionPreferences | null): number {
  if (section === 'reddit') return prefs?.redditDefaultPostLimit ?? 1;
  if (section === 'zhihu') return prefs?.zhihuTopicDefaultPostLimit ?? 3;
  return 1;
}

export function SectionSettingsDialog({ section, label, onClose }: { section: string; label: string; onClose: () => void }) {
  const promptEntries = SECTION_PROMPTS[section] ?? EMPTY_PROMPT_ENTRIES;

  const [targets, setTargets] = useState<Target[]>([]);
  const [currentTargetId, setCurrentTargetId] = useState<string>('');
  const [selected, setSelected] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [promptValues, setPromptValues] = useState<Record<string, string>>({});
  const [defaultPrompts, setDefaultPrompts] = useState<Record<string, string>>({});
  const [savedPrompts, setSavedPrompts] = useState<Record<string, string>>({});
  const [promptOpen, setPromptOpen] = useState<Record<string, boolean>>({});

  const [defaultPostLimit, setDefaultPostLimit] = useState(1);
  const [savedDefaultPostLimit, setSavedDefaultPostLimit] = useState(1);

  const [zhihuTopicSettings, setZhihuTopicSettings] = useState<ZhihuTopicSettings | null>(null);
  const [zhihuTopicCookie, setZhihuTopicCookie] = useState('');
  const [zhihuXZse93, setZhihuXZse93] = useState('');
  const [zhihuXZse96, setZhihuXZse96] = useState('');

  useEffect(() => {
    const fetches: Promise<unknown>[] = [
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/section-settings').then((r) => r.json()),
      fetch('/api/section-preferences').then((r) => r.json()),
    ];
    if (promptEntries.length > 0) {
      fetches.push(fetch('/api/prompts').then((r) => r.json()));
    }
    if (section === 'zhihu') {
      fetches.push(fetch('/api/zhihu/settings').then((r) => r.json()));
    }

    Promise.all(fetches).then((results) => {
      const [appSettings, sectionSettings, prefData, promptData, zhihuSettings] = results as [
        { targets: Target[] },
        Record<string, { facebookTargetId: string | null }>,
        SectionPreferences,
        { prompts: Record<string, string>; defaults: Record<string, string> } | undefined,
        ZhihuTopicSettings | undefined,
      ];

      setTargets(appSettings.targets ?? []);
      const override = sectionSettings[section]?.facebookTargetId ?? null;
      setCurrentTargetId(override ?? '');
      setSelected(override ?? '');

      const limit = defaultLimitForSection(section, prefData);
      setDefaultPostLimit(limit);
      setSavedDefaultPostLimit(limit);

      if (promptData) {
        const vals: Record<string, string> = {};
        const open: Record<string, boolean> = {};
        for (const { key } of promptEntries) {
          vals[key] = promptData.prompts[key] ?? '';
          open[key] = false;
        }
        setPromptValues(vals);
        setSavedPrompts(vals);
        setDefaultPrompts(promptData.defaults ?? {});
        setPromptOpen(open);
      }

      if (zhihuSettings) {
        setZhihuTopicSettings(zhihuSettings);
        setZhihuTopicCookie('');
        setZhihuXZse93('');
        setZhihuXZse96('');
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  }, [section, promptEntries]);

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const jobs: Promise<unknown>[] = [
        postJson('/api/section-settings', { section, facebookTargetId: selected || null }),
      ];

      for (const { key } of promptEntries) {
        const val = promptValues[key] ?? '';
        const isDefault = val === defaultPrompts[key];
        jobs.push(postJson('/api/prompts', { key, template: isDefault ? null : val }));
      }

      if (defaultPostLimit !== savedDefaultPostLimit) {
        jobs.push(postJson<SectionPreferences>('/api/section-preferences', {
          ...(section === 'reddit' ? { redditDefaultPostLimit: defaultPostLimit } : {}),
          ...(section === 'zhihu' ? { zhihuTopicDefaultPostLimit: defaultPostLimit } : {}),
        }).then((next) => {
          const saved = defaultLimitForSection(section, next);
          setDefaultPostLimit(saved);
          setSavedDefaultPostLimit(saved);
        }));
      }

      const hasZhihuTopicChanges = section === 'zhihu' && Boolean(zhihuTopicCookie || zhihuXZse93 || zhihuXZse96);
      if (hasZhihuTopicChanges) {
        jobs.push(
          postJson('/api/zhihu/settings', {
            ...(zhihuTopicCookie ? { topicCookie: zhihuTopicCookie } : {}),
            ...(zhihuXZse93 ? { xZse93: zhihuXZse93 } : {}),
            ...(zhihuXZse96 ? { xZse96: zhihuXZse96 } : {}),
          }),
        );
      }

      await Promise.all(jobs);
      setCurrentTargetId(selected);
      setSavedPrompts({ ...promptValues });

      if (hasZhihuTopicChanges) {
        const next = await fetch('/api/zhihu/settings').then((r) => r.json()) as ZhihuTopicSettings;
        setZhihuTopicSettings(next);
        setZhihuTopicCookie('');
        setZhihuXZse93('');
        setZhihuXZse96('');
      }

      setMessage('Saved.');
    } catch {
      setMessage('Save failed.');
    } finally {
      setSaving(false);
    }
  }

  const hasDefaultLimit = section === 'reddit' || section === 'zhihu';
  const isDirty =
    selected !== currentTargetId ||
    promptEntries.some(({ key }) => promptValues[key] !== savedPrompts[key]) ||
    (hasDefaultLimit && defaultPostLimit !== savedDefaultPostLimit) ||
    (section === 'zhihu' && Boolean(zhihuTopicCookie || zhihuXZse93 || zhihuXZse96));

  const defaultTarget = targets[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-panel p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary">{label} - Settings</h2>
          <button onClick={onClose} className="text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none">x</button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-10 animate-pulse rounded-xl bg-surface" />
            <div className="h-16 animate-pulse rounded-xl bg-surface" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
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

            {hasDefaultLimit && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">
                  Default posts shown per {section === 'reddit' ? 'subreddit' : 'topic'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={defaultPostLimit}
                  onChange={(e) => setDefaultPostLimit(Math.min(Math.max(Number(e.target.value) || 1, 1), 10))}
                  className="w-full rounded-xl border border-divider bg-surface px-3 py-2 text-xs text-primary outline-none focus:border-accent"
                />
              </div>
            )}

            {promptEntries.map(({ key, label: promptLabel }) => (
              <div key={key} className="flex flex-col gap-2 rounded-xl border border-divider bg-surface/40 p-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setPromptOpen((v) => ({ ...v, [key]: !v[key] }))}
                    className="text-left text-xs font-semibold text-muted hover:text-primary bg-transparent border-none cursor-pointer"
                  >
                    {promptOpen[key] ? 'Hide' : 'Show'} {promptLabel}
                  </button>
                  {promptValues[key] !== defaultPrompts[key] && (
                    <button
                      onClick={() => setPromptValues((v) => ({ ...v, [key]: defaultPrompts[key] }))}
                      className="text-xs text-muted hover:text-primary bg-transparent border-none cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                {promptOpen[key] && (
                  <>
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
                  </>
                )}
              </div>
            ))}

            {section === 'zhihu' && (
              <div className="flex flex-col gap-3 rounded-xl border border-divider bg-surface/40 p-3">
                <div>
                  <p className="text-xs font-semibold text-muted">Topic API Headers</p>
                  <p className="mt-1 text-[10px] text-muted">Paste fresh browser request values when Zhihu topic feeds stop working.</p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted">
                    Topic Cookie {zhihuTopicSettings?.topicCookie ? `(${zhihuTopicSettings.topicCookie})` : ''}
                  </label>
                  <textarea
                    value={zhihuTopicCookie}
                    onChange={(e) => setZhihuTopicCookie(e.target.value)}
                    rows={3}
                    spellCheck={false}
                    placeholder="Leave blank to keep current value"
                    className="w-full rounded-xl border border-divider bg-surface px-3 py-2 text-xs text-primary font-mono outline-none focus:border-accent resize-y"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted">
                    x-zse-93 {zhihuTopicSettings?.xZse93 ? `(${zhihuTopicSettings.xZse93})` : ''}
                  </label>
                  <input
                    value={zhihuXZse93}
                    onChange={(e) => setZhihuXZse93(e.target.value)}
                    placeholder="101_3_3.0"
                    className="w-full rounded-xl border border-divider bg-surface px-3 py-2 text-xs text-primary font-mono outline-none focus:border-accent"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted">
                    x-zse-96 {zhihuTopicSettings?.xZse96 ? `(${zhihuTopicSettings.xZse96})` : ''}
                  </label>
                  <input
                    value={zhihuXZse96}
                    onChange={(e) => setZhihuXZse96(e.target.value)}
                    placeholder="2.0_..."
                    className="w-full rounded-xl border border-divider bg-surface px-3 py-2 text-xs text-primary font-mono outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}

            {message && <p className="text-xs text-accent">{message}</p>}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent">
                Close
              </button>
              <button
                onClick={save}
                disabled={saving || !isDirty}
                className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
