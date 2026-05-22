'use client';

import { useEffect, useState } from 'react';

type Target = { id: string; name: string };

export function SectionSettingsDialog({ section, label, onClose }: { section: string; label: string; onClose: () => void }) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [currentTargetId, setCurrentTargetId] = useState<string>('');
  const [selected, setSelected] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/section-settings').then((r) => r.json()),
    ]).then(([appSettings, sectionSettings]: [{ targets: Target[] }, Record<string, { facebookTargetId: string | null }>]) => {
      setTargets(appSettings.targets ?? []);
      const override = sectionSettings[section]?.facebookTargetId ?? null;
      setCurrentTargetId(override ?? '');
      setSelected(override ?? '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [section]);

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      await fetch('/api/section-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, facebookTargetId: selected || null }),
      });
      setCurrentTargetId(selected);
      setMessage('Đã lưu.');
    } catch {
      setMessage('Lỗi khi lưu.');
    } finally {
      setSaving(false);
    }
  }

  const defaultTarget = targets[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-panel p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary">{label} — Settings</h2>
          <button onClick={onClose} className="text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none">✕</button>
        </div>

        {loading ? (
          <div className="h-10 animate-pulse rounded-xl bg-surface" />
        ) : (
          <div className="flex flex-col gap-3">
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
                disabled={saving || selected === currentTargetId}
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
