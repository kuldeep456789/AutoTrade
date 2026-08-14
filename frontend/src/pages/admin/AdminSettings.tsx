import { useState, useEffect } from 'react';
import { useGetSettingsQuery, useUpdateSettingsMutation } from '../../store/slices/settingsApiSlice';
import toast from 'react-hot-toast';
import { Save, Loader2, Coins, ShieldCheck, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAdminCurrency } from '../../hooks/useAdminCurrency';
import { type CurrencyCode } from '../../context/CurrencyContext';

import { useDiscount } from '../../context/DiscountContext';

const AdminSettings = () => {
  const { data: settings, isLoading } = useGetSettingsQuery(undefined);
  const [updateSettings, { isLoading: isUpdating }] = useUpdateSettingsMutation();
  const { adminCurrency, updateAdminCurrency } = useAdminCurrency();
  const { discountPercentage, setDiscountPercentage } = useDiscount();

  const [formData, setFormData] = useState({
    currencyRateUSD: 0.012,
    currencyRateEUR: 0.011,
    currencyRateINR: 1,
    adminSecretCode: 'secret_admin_123',
  });

  const [showSecretCode, setShowSecretCode] = useState(false);

  useEffect(() => {
    if (settings) {
      const data = settings.settings || settings;
      setFormData({
        currencyRateUSD: data.currencyRateUSD ?? 0.012,
        currencyRateEUR: data.currencyRateEUR ?? 0.011,
        currencyRateINR: data.currencyRateINR ?? 1,
        adminSecretCode: data.adminSecretCode || 'secret_admin_123',
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        currencyRateUSD: Number(formData.currencyRateUSD),
        currencyRateEUR: Number(formData.currencyRateEUR),
        currencyRateINR: Number(formData.currencyRateINR),
        adminSecretCode: String(formData.adminSecretCode || '').trim(),
        defaultDiscountPct: Number(discountPercentage),
      };
      await updateSettings(payload).unwrap();
      toast.success('Global settings saved successfully.');
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to update settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Global Settings</h1>
      </div>

      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm mb-8">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-orange-500" />
              Admin UI Preferences
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Select your preferred display currency for the admin dashboard.
            </p>
          </div>
          <select 
            value={adminCurrency}
            onChange={(e) => updateAdminCurrency(e.target.value as CurrencyCode)}
            className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-zinc-900 dark:text-white font-bold cursor-pointer"
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm mb-8">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            Security & Registration Secret
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Configure the Admin Secret Code used during account registration to grant Administrator privileges.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Admin Secret Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <KeyRound size={18} />
              </div>
              <input
                type={showSecretCode ? 'text' : 'password'}
                name="adminSecretCode"
                value={formData.adminSecretCode}
                onChange={handleChange}
                placeholder="Enter new admin secret code..."
                className="w-full pl-10 pr-12 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-zinc-900 dark:text-white font-mono text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecretCode((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                title={showSecretCode ? 'Hide Secret Code' : 'Show Secret Code'}
              >
                {showSecretCode ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              Users registering on the <code>/register</code> page must enter this secret code to create an Admin account.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Secret Code
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Currency & Taxes</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage global conversion rates (from base INR) and tax percentages.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                USD Rate (1 INR = X USD)
              </label>
              <input
                type="number"
                step="0.000001"
                name="currencyRateUSD"
                value={formData.currencyRateUSD}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-zinc-900 dark:text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                EUR Rate (1 INR = X EUR)
              </label>
              <input
                type="number"
                step="0.000001"
                name="currencyRateEUR"
                value={formData.currencyRateEUR}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-zinc-900 dark:text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                INR Base Rate (Default: 1)
              </label>
              <input
                type="number"
                step="0.000001"
                name="currencyRateINR"
                value={formData.currencyRateINR}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-zinc-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Global Default OFF Discount Badge Rate (%)
              </label>
              <select
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-zinc-900 dark:text-white font-medium cursor-pointer"
              >
                <option value={10}>10% OFF Badge</option>
                <option value={15}>15% OFF Badge</option>
                <option value={20}>20% OFF Badge (Default)</option>
                <option value={25}>25% OFF Badge</option>
                <option value={30}>30% OFF Badge</option>
                <option value={40}>40% OFF Badge</option>
                <option value={50}>50% OFF Badge</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
