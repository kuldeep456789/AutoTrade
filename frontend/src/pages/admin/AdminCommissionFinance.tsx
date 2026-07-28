import { useState, useEffect, useCallback } from 'react';
import { adminApi, type AnalyticsData, type StoreSettings } from '../../services/adminApi';

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
      // Refresh to confirm
      await fetchData();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to save rates');
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
        <div className="w-8 h-8 border-2 border-[#382620] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-600 mb-2">{error}</p>
        <button onClick={fetchData} className="text-[#382620] underline font-medium">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 font-sans text-[#382620]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#382620]">Commission & Finance</h1>
          <p className="text-sm text-gray-500 mt-1">Computed from paid orders over the last {days} days</p>
        </div>
        <div className="flex border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm">
          {[7, 30, 90].map(d => (
            <button 
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 text-sm font-medium cursor-pointer transition-colors ${days === d ? 'bg-[#382620] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-2">Gross Revenue</p>
          <h3 className="text-2xl font-bold text-[#b5853b]">{formatCurrency(grossRevenue)}</h3>
          <p className="text-xs text-gray-500 mt-2">{totalPaidOrders} paid orders</p>
        </div>

        {/* GST */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-2">GST</p>
          <h3 className="text-2xl font-bold text-[#382620]">{formatCurrency(gst)}</h3>
          <p className="text-xs text-gray-500 mt-2">{rates.gstRate}% (inclusive)</p>
        </div>

        {/* Gateway Fees */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-2">Gateway Fees</p>
          <h3 className="text-2xl font-bold text-[#382620]">{formatCurrency(gatewayFees)}</h3>
          <p className="text-xs text-gray-500 mt-2">{rates.gatewayFeePercent}% + {formatCurrency(rates.gatewayFixedFee)}</p>
        </div>

        {/* Commission */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-2">Commission</p>
          <h3 className="text-2xl font-bold text-[#382620]">{formatCurrency(commission)}</h3>
          <p className="text-xs text-gray-500 mt-2">{rates.commissionRate}% of net</p>
        </div>
      </div>

      {/* Breakdown and Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* Settlement Breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] p-8">
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-6">Settlement Breakdown</p>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[15px]">
              <span className="text-gray-500">Gross revenue</span>
              <span className="font-semibold text-gray-900">{formatCurrency(grossRevenue)}</span>
            </div>
            
            <div className="flex justify-between items-center text-[15px]">
              <span className="text-gray-500">GST ({rates.gstRate}%)</span>
              <span className="font-semibold text-[#e56d6d]">- {formatCurrency(gst)}</span>
            </div>
            
            <div className="flex justify-between items-center text-[15px]">
              <span className="text-gray-500">Payment gateway fees</span>
              <span className="font-semibold text-[#e56d6d]">- {formatCurrency(gatewayFees)}</span>
            </div>

            <div className="flex justify-between items-center text-[15px]">
              <span className="text-gray-500">Commission ({rates.commissionRate}%)</span>
              <span className="font-semibold text-[#e56d6d]">- {formatCurrency(commission)}</span>
            </div>

            <div className="flex justify-between items-center text-[15px]">
              <span className="text-gray-500">Coupon cost</span>
              <span className="font-semibold text-[#e56d6d]">- {formatCurrency(couponCost)}</span>
            </div>

            <div className="flex justify-between items-center text-[15px]">
              <span className="text-gray-500">Refunds issued</span>
              <span className="font-semibold text-[#e56d6d]">- {formatCurrency(refundsIssued)}</span>
            </div>

            <div className="pt-6 mt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#382620] text-base">Net settlement</span>
                <span className="font-bold text-[#382620] text-2xl">{formatCurrency(netSettlement)}</span>
              </div>
              <p className="text-[13px] text-gray-400 mt-3">Settled every {rates.settlementCycleDays} days.</p>
            </div>
          </div>
        </div>

        {/* Rates Form */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] p-8">
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-6">Rates</p>
          
          <div className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-gray-600 mb-2">GST rate (%)</label>
              <input 
                type="number"
                value={rates.gstRate}
                onChange={(e) => setRates(r => ({ ...r, gstRate: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#382620] focus:border-[#382620] transition-colors" 
              />
            </div>
            
            <div>
              <label className="block text-[13px] font-medium text-gray-600 mb-2">Commission rate (%)</label>
              <input 
                type="number"
                value={rates.commissionRate}
                onChange={(e) => setRates(r => ({ ...r, commissionRate: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#382620] focus:border-[#382620] transition-colors" 
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-600 mb-2">Gateway fee (%)</label>
              <input 
                type="number"
                step="0.1"
                value={rates.gatewayFeePercent}
                onChange={(e) => setRates(r => ({ ...r, gatewayFeePercent: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#382620] focus:border-[#382620] transition-colors" 
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-600 mb-2">Gateway fixed fee ({settings?.currency || 'INR'})</label>
              <input 
                type="number"
                step="0.1"
                value={rates.gatewayFixedFee}
                onChange={(e) => setRates(r => ({ ...r, gatewayFixedFee: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#382620] focus:border-[#382620] transition-colors" 
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-600 mb-2">Settlement cycle (days)</label>
              <input 
                type="number"
                value={rates.settlementCycleDays}
                onChange={(e) => setRates(r => ({ ...r, settlementCycleDays: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#382620] focus:border-[#382620] transition-colors" 
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-600 mb-2">Currency</label>
              <select 
                value={settings?.currency || 'INR'}
                onChange={(e) => setSettings(s => s ? { ...s, currency: e.target.value } : s)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#382620] focus:border-[#382620] transition-colors cursor-pointer" 
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
                className="cursor-pointer w-full py-3 bg-[#382620] text-white rounded-lg text-[13px] font-bold tracking-widest uppercase hover:bg-[#281b16] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#382620] disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Save Rates'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
