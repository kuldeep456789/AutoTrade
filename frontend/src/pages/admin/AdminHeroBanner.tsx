import { useState, useEffect, useCallback } from 'react';
import { Save, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { adminApi, type StoreSettings } from '../../services/adminApi';
import toast from 'react-hot-toast';

export default function AdminHeroBanner() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.settings.get();
      setSettings(data.settings);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setError(null);
      const data = await adminApi.settings.update(settings);
      setSettings(data.settings);
      setSuccess(true);
      toast.success('Store settings saved successfully');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save settings');
      toast.error(err?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Store Settings</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Configure your store details and preferences</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchSettings} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm cursor-pointer transition-colors">
            <RefreshCw className="h-4 w-4 text-orange-500" />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-sm font-semibold">
          ✓ Settings saved successfully!
        </div>
      )}

      <div className="max-w-3xl mx-auto mt-8">
        {/* Store Details */}
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6 sm:p-8 space-y-8 backdrop-blur-md transition-colors duration-200">
          <div className="flex items-center gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500 border border-orange-500/20">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Store Details</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage your store's primary identity and preferences</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Store Name</label>
              <input
                type="text"
                value={settings?.storeName ?? ''}
                onChange={(e) => setSettings(p => p ? { ...p, storeName: e.target.value } : p)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 transition-all"
                placeholder="Enter store name"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Store Email</label>
              <input
                type="email"
                value={settings?.storeEmail ?? ''}
                onChange={(e) => setSettings(p => p ? { ...p, storeEmail: e.target.value } : p)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 transition-all"
                placeholder="support@yourstore.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Currency</label>
              <select
                value={settings?.currency ?? 'INR'}
                onChange={(e) => setSettings(p => p ? { ...p, currency: e.target.value } : p)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Free Shipping Over (₹)</label>
              <input
                type="number"
                value={settings?.freeShippingThreshold ?? 499}
                onChange={(e) => setSettings(p => p ? { ...p, freeShippingThreshold: Number(e.target.value) } : p)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 transition-all"
                placeholder="e.g. 499"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
