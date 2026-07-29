import { useState, useEffect, useCallback } from 'react';
import { adminApi, type AnalyticsData, type StoreSettings } from '../../services/adminApi';
import toast from 'react-hot-toast';

export default function AdminCommissionFinance() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  // Form State for Rates
  const [rates, setRates] = useState({
    gstRate: 18,
    commissionRate: 10,
    gatewayFeePercent: 2.9,
    gatewayFixedFee: 0.3,
    settlementCycleDays: 7
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [analyticsData, settingsData] = await Promise.all([
        adminApi.analytics.get(days),
        adminApi.settings.get()
      ]);
      setAnalytics(analyticsData);
      setSettings(settingsData.settings);
      setRates({
        gstRate: settingsData.settings.gstRate ?? 18,
        commissionRate: settingsData.settings.commissionRate ?? 10,
        gatewayFeePercent: settingsData.settings.gatewayFeePercent ?? 2.9,
        gatewayFixedFee: settingsData.settings.gatewayFixedFee ?? 0.3,
        settlementCycleDays: settingsData.settings.settlementCycleDays ?? 7
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveRates = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      await adminApi.settings.update({
        ...settings,
        ...rates
      });
      toast.success('Finance rates saved successfully');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save rates');
    } finally {
      setSaving(false);
    }
  };

  // Calculations
  const totalRevenue = analytics?.revenueByDay?.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalPaidOrders = analytics?.revenueByDay?.reduce((s, d) => s + d.count, 0) ?? 0;

  // Real-time calculated values based on form input
  const grossRevenue = totalRevenue;
  
  // GST (Inclusive) = Gross * (Rate / (100 + Rate))
  const gst = grossRevenue * (rates.gstRate / (100 + rates.gstRate));
  
  // Gateway Fees = (Gross * % Fee) + (Fixed Fee * Paid Orders)
  const gatewayFees = (grossRevenue * (rates.gatewayFeePercent / 100)) + (rates.gatewayFixedFee * totalPaidOrders);
  
  // Commission = (Gross - GST) * Commission Rate
  const commissionBase = grossRevenue - gst;
  const commission = commissionBase * (rates.commissionRate / 100);

  // Mocked missing values
  const couponCost = 0;
  const refundsIssued = 0;

  // Net Settlement = Gross - GST - Gateway - Commission - Coupons - Refunds
  const netSettlement = grossRevenue - gst - gatewayFees - commission - couponCost - refundsIssued;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: settings?.currency || 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 mb-2 font-semibold">{error}</p>
        <button onClick={fetchData} className="text-orange-500 underline font-bold">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Commission & Finance</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Computed from paid orders over the last {days} days</p>
        </div>
        <div className="flex border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm p-1 gap-1">
          {[7, 30, 90].map(d => (
            <button 
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                days === d 
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white dark:bg-zinc-900/90 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-md">
          <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-2">Gross Revenue</p>
          <h3 className="text-2xl font-extrabold text-orange-500">{formatCurrency(grossRevenue)}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">{totalPaidOrders} paid orders</p>
        </div>

        {/* GST */}
        <div className="bg-white dark:bg-zinc-900/90 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-md">
          <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-2">GST</p>
          <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white">{formatCurrency(gst)}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">{rates.gstRate}% (inclusive)</p>
        </div>

        {/* Gateway Fees */}
        <div className="bg-white dark:bg-zinc-900/90 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-md">
          <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-2">Gateway Fees</p>
          <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white">{formatCurrency(gatewayFees)}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">{rates.gatewayFeePercent}% + {formatCurrency(rates.gatewayFixedFee)}</p>
        </div>

        {/* Commission */}
        <div className="bg-white dark:bg-zinc-900/90 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-md">
          <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-2">Commission</p>
          <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white">{formatCurrency(commission)}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">{rates.commissionRate}% of net</p>
        </div>
      </div>

      {/* Breakdown and Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* Settlement Breakdown */}
        <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 sm:p-8 backdrop-blur-md">
          <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-6">Settlement Breakdown</p>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-zinc-500 dark:text-zinc-400">Gross revenue</span>
              <span className="font-bold text-zinc-900 dark:text-white">{formatCurrency(grossRevenue)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-zinc-500 dark:text-zinc-400">GST ({rates.gstRate}%)</span>
              <span className="font-bold text-red-500">- {formatCurrency(gst)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-zinc-500 dark:text-zinc-400">Payment gateway fees</span>
              <span className="font-bold text-red-500">- {formatCurrency(gatewayFees)}</span>
            </div>

            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-zinc-500 dark:text-zinc-400">Commission ({rates.commissionRate}%)</span>
              <span className="font-bold text-red-500">- {formatCurrency(commission)}</span>
            </div>

            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-zinc-500 dark:text-zinc-400">Coupon cost</span>
              <span className="font-bold text-red-500">- {formatCurrency(couponCost)}</span>
            </div>

            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-zinc-500 dark:text-zinc-400">Refunds issued</span>
              <span className="font-bold text-red-500">- {formatCurrency(refundsIssued)}</span>
            </div>

            <div className="pt-6 mt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-900 dark:text-white text-base">Net settlement</span>
                <span className="font-extrabold text-orange-500 text-2xl sm:text-3xl">{formatCurrency(netSettlement)}</span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-3 font-medium">Settled every {rates.settlementCycleDays} days.</p>
            </div>
          </div>
        </div>

        {/* Rates Form */}
        <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 sm:p-8 backdrop-blur-md">
          <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-6">Rates</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">GST rate (%)</label>
              <input 
                type="number"
                value={rates.gstRate}
                onChange={(e) => setRates(r => ({ ...r, gstRate: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Commission rate (%)</label>
              <input 
                type="number"
                value={rates.commissionRate}
                onChange={(e) => setRates(r => ({ ...r, commissionRate: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Gateway fee (%)</label>
              <input 
                type="number"
                step="0.1"
                value={rates.gatewayFeePercent}
                onChange={(e) => setRates(r => ({ ...r, gatewayFeePercent: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Gateway fixed fee ({settings?.currency || 'INR'})</label>
              <input 
                type="number"
                step="0.1"
                value={rates.gatewayFixedFee}
                onChange={(e) => setRates(r => ({ ...r, gatewayFixedFee: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Settlement cycle (days)</label>
              <input 
                type="number"
                value={rates.settlementCycleDays}
                onChange={(e) => setRates(r => ({ ...r, settlementCycleDays: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Currency</label>
              <select 
                value={settings?.currency || 'INR'}
                onChange={(e) => setSettings(s => s ? { ...s, currency: e.target.value } : s)}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors cursor-pointer" 
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div className="pt-2">
              <button 
                onClick={handleSaveRates}
                disabled={saving}
                className="cursor-pointer w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-md shadow-orange-500/20 disabled:opacity-70"
              >
                {saving ? 'Saving Rates...' : 'Save Rates'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
