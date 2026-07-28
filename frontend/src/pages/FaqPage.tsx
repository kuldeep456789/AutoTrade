import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, CreditCard, Truck,
  RotateCcw, Package, Globe, Ruler, ChevronRight, MessageCircle
} from 'lucide-react';

const faqCategories = [
  {
    title: 'Payments',
    icon: CreditCard,
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept Visa, Mastercard, American Express, UPI, and PayPal.' }
    ]
  },
  {
    title: 'Shipping',
    icon: Truck,
    items: [
      { q: 'How long does shipping take?', a: 'Standard shipping takes 5-8 business days within India. Express shipping (2-3 days) is available at checkout. International orders typically take 7-14 business days.' }
    ]
  },
  {
    title: 'Returns',
    icon: RotateCcw,
    items: [
      { q: 'What is your return policy?', a: 'We offer free returns within 15 days of delivery. Items must be unworn with tags attached. Refunds are processed within 5-7 business days after we receive the return.' }
    ]
  },
  {
    title: 'Orders',
    icon: Package,
    items: [
      { q: 'How do I track my order?', a: 'Once your order ships, you will receive a tracking link via email and SMS. You can also track your order anytime from your Account dashboard.' },
      { q: 'Can I cancel or modify my order?', a: 'Orders can be cancelled within 2 hours of placement, provided they have not been shipped. Contact our support team immediately for assistance.' }
    ]
  },
  {
    title: 'International',
    icon: Globe,
    items: [
      { q: 'Do you ship internationally?', a: 'Yes! We ship to over 40 countries worldwide. International shipping rates and delivery times vary by destination and are calculated at checkout.' }
    ]
  },
  {
    title: 'Size Guide',
    icon: Ruler,
    items: [
      { q: 'How do I find my size?', a: 'Each product page has a detailed size guide with measurements in inches and centimeters. If you are between sizes, we recommend sizing up for an oversized fit.' }
    ]
  }
];

const FaqPage = () => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCategories = faqCategories;

  return (
    <div className="bg-[#FAFAFA] dark:bg-[#0a0a0a] min-h-screen font-sans relative overflow-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute top-0 inset-x-0 h-[600px] pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-20 w-96 h-96 bg-zinc-200 dark:bg-zinc-800/40 rounded-full blur-[100px] opacity-70" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-zinc-200/80 dark:bg-zinc-800/30 rounded-full blur-[80px] opacity-60" />
      </div>

      {/* Breadcrumbs */}
      <div className="relative z-10 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 px-6 sm:px-10 py-4 flex items-center text-xs font-bold tracking-widest text-zinc-500 uppercase backdrop-blur-md">
        <Link to="/" className="hover:text-zinc-900 dark:hover:text-white transition-colors">HOME</Link>
        <ChevronRight size={10} strokeWidth={3} className="mx-2" />
        <span className="text-zinc-900 dark:text-white">FAQ</span>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 w-full px-6 sm:px-10 pt-24 pb-20 max-w-4xl mx-auto text-center">
        {/* <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6">
          <MessageCircle size={14} className="text-zinc-600 dark:text-zinc-400" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-600 dark:text-zinc-400">Support Center</span>
        </div> */}
        <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-500 pb-2">
          Frequently Asked Questions
        </h1>
      </div>

      {/* FAQ & CTA Layout */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16 items-start">
          
          {/* FAQ List (Left Side) */}
          <div className="lg:col-span-2 flex flex-col gap-10">
            {filteredCategories.map((category, catIndex) => {
              const Icon = category.icon;
              return (
                <div key={catIndex} className="flex flex-col gap-5">
                  <div className="flex items-center gap-3 mb-2 px-2">
                    <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
                      <Icon size={20} strokeWidth={2.5} className="text-[#111111] dark:text-white relative z-10" />
                      <div className="absolute inset-0 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/50 blur-md opacity-50" />
                    </div>
                    <h3 className="text-[20px] font-bold text-[#111111] dark:text-white">{category.title}</h3>
                  </div>

                  {category.items.map((item, itemIndex) => {
                    const id = `${catIndex}-${itemIndex}`;
                    const isOpen = !!openItems[id];

                    return (
                      <div
                        key={itemIndex}
                        className={`
                            group/card rounded-[24px] border border-zinc-200/80 dark:border-zinc-800/80 
                            bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]
                            transition-all duration-300 transform hover:-translate-y-0.5
                            ${isOpen ? 'ring-2 ring-[#111111]/5 dark:ring-white/10 bg-white dark:bg-zinc-900 shadow-md' : ''}
                          `}
                      >
                        <button
                          onClick={() => toggleItem(id)}
                          className="w-full flex items-center justify-between p-6 sm:p-7 text-left cursor-pointer group"
                        >
                          <span className="text-[16px] font-semibold text-[#111111] dark:text-white pr-4">
                            {item.q}
                          </span>
                          <span className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-700 transition-colors">
                            <ChevronDown
                              size={16}
                              strokeWidth={2}
                              className={`text-zinc-500 dark:text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </span>
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 max-h-96 pb-7 px-6 sm:px-7' : 'opacity-0 max-h-0'
                            }`}
                        >
                          <p className="text-[15px] text-zinc-600 dark:text-zinc-400 leading-relaxed pr-8">
                            {item.a}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Right Side Sticky CTA */}
          <div className="lg:col-span-1 lg:sticky lg:top-32">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/60 rounded-3xl p-8 text-center shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05]" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 mb-6">
                  <MessageCircle size={24} className="text-[#111111] dark:text-white" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-black text-[#111111] dark:text-white mb-3 tracking-tight">Still need help?</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-[15px] leading-relaxed">
                  Can't find the answer you're looking for? Our support team is available 24/7 to assist you.
                </p>
                <Link
                  to="/contact"
                  className="inline-flex w-full items-center justify-center gap-2.5 px-6 h-12 rounded-xl bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-bold text-[14px] hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                >
                  Contact Support
                  <ChevronRight size={16} strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default FaqPage;
