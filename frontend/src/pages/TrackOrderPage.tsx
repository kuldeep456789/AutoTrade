import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package } from 'lucide-react';

const TrackOrderPage = () => {
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) {
      setError('Invalid Token / Order ID');
      return;
    }
    setError('');
    // Remove # symbol if the user pasted it (e.g. #87E5CE9F), since # breaks the URL route
    navigate(`/orders/${orderId.trim().replace(/^#/, '')}`);
  };

  return (
    <div className="bg-[#FAFAFA] dark:bg-[#0a0a0a] min-h-screen text-[hsl(var(--foreground))] font-sans selection:bg-[#d4af37] selection:text-black relative overflow-hidden">
      {/* Premium Decorative Background Glows */}
      <div className="absolute top-0 inset-x-0 h-[600px] pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#d4af37]/20 dark:bg-[#d4af37]/10 rounded-full blur-[120px] opacity-70" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-zinc-300/40 dark:bg-zinc-800/30 rounded-full blur-[100px] opacity-60" />
      </div>

      {/* Container */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-10 py-12 lg:py-24 space-y-8 lg:space-y-12">
        {/* Track Order Form Card Container */}
        <div className="max-w-xl mx-auto">
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-[32px] p-8 sm:p-12 shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37] opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
                <Package className="text-[#d4af37] w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-wide uppercase text-[#111111] dark:text-white">WHERE IS MY ORDER?</h2>
                <p className="text-sm text-zinc-400 mt-1">Enter your order ID to track your package in real time.</p>
              </div>
            </div>

            <form onSubmit={handleTrack} className="space-y-6 relative z-10">
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <div className="w-6 h-4 border border-[#d4af37]/50 rounded-[2px] bg-[#d4af37]/10"></div>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter Order ID (e.g. AE-123456)"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-transparent border border-zinc-300 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:border-[#d4af37]/50 transition-colors placeholder:text-zinc-500 text-[#111111] dark:text-white"
                    required
                  />
                </div>
                {error && (
                  <p className="text-red-500 text-xs font-semibold mt-2 ml-1">{error}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#b68945] via-[#d4af37] to-[#e4c985] text-black text-sm font-bold tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.15)]"
              >
                <Search size={16} strokeWidth={2.5} />
                TRACK ORDER
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrderPage;
