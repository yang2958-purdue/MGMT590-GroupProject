'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const configStatus = useAppStore((s) => s.configStatus);
  const setConfigStatus = useAppStore((s) => s.setConfigStatus);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getConfig().then(setConfigStatus).catch(() => setConfigStatus(null));
  }, [setConfigStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (anthropicKey.trim()) payload.anthropic_api_key = anthropicKey.trim();
      await api.saveConfig(payload);
      const status = await api.getConfig();
      setConfigStatus(status);
      setAnthropicKey('');
      setMessage('Settings saved. API keys are never sent back to the app.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anthropic API Key
          </label>
          <p className="text-xs text-gray-500 mb-1">
            {configStatus?.anthropic_api_key_set ? 'Currently set (leave blank to keep)' : 'Required for resume tailoring'}
          </p>
          <input
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder={configStatus?.anthropic_api_key_set ? '••••••••' : 'Enter key'}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
      {message && (
        <p className={`mt-4 text-sm ${message.startsWith('Settings') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
