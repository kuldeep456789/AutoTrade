import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { savePaymentMethod } from '../store/slices/cartSlice';
import CheckoutSteps from '../components/checkout/CheckoutSteps';
import OrderSummarySidebar from '../components/checkout/OrderSummarySidebar';
import { CreditCard, Smartphone, Landmark, Check, Sparkles } from 'lucide-react';

const paymentOptions = [
  {
    value: 'Stripe',
    label: 'Stripe Secure Payment',
    sub: 'Pay via Credit/Debit Cards, UPI, NetBanking & Wallets',
    icon: CreditCard,
    badge: 'Popular & Instant',
    icons: (
      <div className="flex items-center gap-2">
        <CreditCard size={18} strokeWidth={1.5} className="text-zinc-400 dark:text-zinc-300" />
        <Smartphone size={18} strokeWidth={1.5} className="text-zinc-400 dark:text-zinc-300" />
        <Landmark size={18} strokeWidth={1.5} className="text-zinc-400 dark:text-zinc-300" />
      </div>
    ),
  },
];

const PaymentPage = () => {
  const cart = useSelector((state: RootState) => state.cart);
  const { shippingAddress, paymentMethod: defaultPaymentMethod } = cart;
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod || 'Stripe');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!cart.cartItems || cart.cartItems.length === 0 || cart.totalPrice <= 0) {
      navigate('/cart');
    } else if (!shippingAddress.address) {
      navigate('/shipping');
    }
  }, [shippingAddress, cart.cartItems, cart.totalPrice, navigate]);

  const submitHandler = () => {
    dispatch(savePaymentMethod(paymentMethod));
    navigate('/placeorder');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <CheckoutSteps step1 step2 />

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 xl:gap-12 mt-6">

          {/* ── Left: Payment options ── */}
          <div className="w-full lg:w-[65%]">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-xl overflow-hidden backdrop-blur-md">
              <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-zinc-100 dark:border-zinc-800/80">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20">
                    <Sparkles size={13} /> Step 02 of 03
                  </span>
                </div>
                <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Select Payment Method
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  All transactions are safe, encrypted, and backed by AutoTrade Buyer Guarantee.
                </p>
              </div>

              <div className="px-6 sm:px-8 py-6 space-y-4">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = paymentMethod === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setPaymentMethod(option.value)}
                      className={`relative w-full flex items-start sm:items-center gap-4 sm:gap-5 px-5 sm:px-6 py-5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/5 dark:bg-orange-500/10 shadow-md shadow-orange-500/10'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
                      }`}
                    >
                      {/* Custom Radio Indicator */}
                      <span
                        className={`shrink-0 mt-0.5 sm:mt-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>

                      {/* Icon */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                          isSelected
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700'
                        }`}
                      >
                        <Icon size={20} strokeWidth={1.75} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={`text-base font-bold tracking-tight transition-colors ${
                              isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            {option.label}
                          </p>
                          {option.badge && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 uppercase tracking-wider">
                              {option.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                          {option.sub}
                        </p>
                      </div>

                      {/* Payment Icons */}
                      <div className="hidden sm:block shrink-0">{option.icons}</div>
                    </button>
                  );
                })}
              </div>


            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="w-full lg:w-[35%]">
            <OrderSummarySidebar
              buttonText="Continue to Review"
              buttonAction={submitHandler}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
