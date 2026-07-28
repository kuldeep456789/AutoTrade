import { Link } from 'react-router-dom';
import { Truck, Clock, Package, IndianRupee, MapPin, ChevronRight, CheckCircle2 } from 'lucide-react';

const couriers = [
  { name: 'Delhivery', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z' },
  { name: 'Blue Dart', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
  { name: 'DTDC', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
  { name: 'Xpressbees', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
  { name: 'Ekart', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
];

const ShippingPolicyPage = () => {
  return (
    <div className="bg-[hsl(var(--background))] min-h-screen text-[hsl(var(--foreground))]">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-6">
          <Link to="/" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">HOME</Link>
          <ChevronRight size={10} strokeWidth={2.5} />
          <span className="text-zinc-700 dark:text-zinc-300">SHIPPING POLICY</span>
        </div>

        {/* Header */}
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Shipping Policy</h1>
          <p className="text-sm text-zinc-500 font-medium">Everything you need to know about our shipping and delivery.</p>
        </div>

        {/* Shipping Information */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <Truck size={20} strokeWidth={1.5} />
            </div>
            <h2 className="text-[18px] font-bold">Shipping Information</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: 'Free Shipping', sub: 'On all orders above', price: '₹999' },
              { title: 'Standard Delivery', sub: '3–7 Business Days', price: '₹99' },
              { title: 'Express Delivery', sub: '1–2 Business Days', price: '₹249' },
            ].map((item) => (
              <div key={item.title} className="bg-[hsl(var(--card))] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 text-center hover:shadow-sm transition-shadow">
                <p className="text-[13px] font-medium text-zinc-500 mb-1">{item.sub}</p>
                <p className="text-[15px] font-bold">{item.title}</p>
                <p className="text-[20px] font-bold mt-1">{item.price}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-[13px] text-zinc-500 font-medium">
              <span className="font-bold text-[hsl(var(--foreground))]">International Shipping:</span> Currently unavailable
            </p>
          </div>
        </section>

        {/* Order Processing */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <Clock size={20} strokeWidth={1.5} />
            </div>
            <h2 className="text-[18px] font-bold">Order Processing</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-[hsl(var(--card))] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
              <p className="text-[14px] font-semibold mb-2">Orders placed before 2 PM</p>
              <p className="text-[13px] text-green-600 font-medium">→ Shipped the same day</p>
            </div>
            <div className="bg-[hsl(var(--card))] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
              <p className="text-[14px] font-semibold mb-2">Orders after 2 PM</p>
              <p className="text-[13px] text-zinc-500 font-medium">→ Shipped next business day</p>
            </div>
          </div>
        </section>

        {/* Delivery Partners */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <Package size={20} strokeWidth={1.5} />
            </div>
            <h2 className="text-[18px] font-bold">Delivery Partners</h2>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {couriers.map((courier) => (
              <div key={courier.name} className="bg-[hsl(var(--card))] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center hover:shadow-sm transition-shadow">
                <CheckCircle2 strokeWidth={1.5} className="w-8 h-8 mx-auto mb-3 text-zinc-500" />
                <span className="text-[11px] font-bold">{courier.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Shipping Charges Table */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <IndianRupee size={20} strokeWidth={1.5} />
            </div>
            <h2 className="text-[18px] font-bold">Shipping Charges</h2>
          </div>
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800 text-left">
                  <th className="px-5 py-3 font-bold">Order Value</th>
                  <th className="px-5 py-3 font-bold">Shipping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr>
                  <td className="px-5 py-3">Above ₹999</td>
                  <td className="px-5 py-3"><span className="text-green-600 font-bold">Free</span></td>
                </tr>
                <tr>
                  <td className="px-5 py-3">Below ₹999</td>
                  <td className="px-5 py-3">₹99</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>


      </div>
    </div>
  );
};

export default ShippingPolicyPage;
