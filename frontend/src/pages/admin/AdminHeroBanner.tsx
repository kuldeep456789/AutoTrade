import { useState, useEffect, useCallback } from 'react';
import { Save, RefreshCw, Settings, Plus, X, AlertCircle } from 'lucide-react';
import { adminApi, type StoreSettings } from '../../services/adminApi';

export default function AdminHeroBanner() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newBannerUrl, setNewBannerUrl] = useState('');

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
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addBanner = () => {
    const url = newBannerUrl.trim();
    if (!url || !settings) return;
    setSettings(prev => prev ? { ...prev, heroBannerImages: [...(prev.heroBannerImages ?? []), url] } : prev);
    setNewBannerUrl('');
  };

  const removeBanner = (idx: number) => {
    if (!settings) return;
    setSettings(prev => prev ? {
      ...prev,
      heroBannerImages: prev.heroBannerImages.filter((_, i) => i !== idx)
    } : prev);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#0050cb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Store Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your store details, banners, and preferences</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchSettings} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#0050cb] text-white rounded text-sm font-medium hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ Settings saved successfully!
        </div>
      )}

      <div className="max-w-3xl mx-auto mt-8">
        {/* Store Details */}
        <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 sm:p-8 space-y-8">
          <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
            <div className="p-3 bg-blue-50/50 rounded-xl text-[#0050cb] border border-blue-100/50">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Store Details</h2>
              <p className="text-sm text-gray-500 mt-1">Manage your store's primary identity and preferences</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Store Name</label>
              <input
                type="text"
                value={settings?.storeName ?? ''}
                onChange={(e) => setSettings(p => p ? { ...p, storeName: e.target.value } : p)}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all"
                placeholder="Enter store name"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Store Email</label>
              <input
                type="email"
                value={settings?.storeEmail ?? ''}
                onChange={(e) => setSettings(p => p ? { ...p, storeEmail: e.target.value } : p)}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all"
                placeholder="support@yourstore.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Currency</label>
              <select
                value={settings?.currency ?? 'INR'}
                onChange={(e) => setSettings(p => p ? { ...p, currency: e.target.value } : p)}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all cursor-pointer"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Free Shipping Over (₹)</label>
              <input
                type="number"
                value={settings?.freeShippingThreshold ?? 499}
                onChange={(e) => setSettings(p => p ? { ...p, freeShippingThreshold: Number(e.target.value) } : p)}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all"
                placeholder="e.g. 499"
              />
            </div>
          </div>
        </div>




      </div>
    </div>
  );
}
