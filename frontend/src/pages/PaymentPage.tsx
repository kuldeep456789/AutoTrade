import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { savePaymentMethod } from '../store/slices/cartSlice';
import CheckoutSteps from '../components/checkout/CheckoutSteps';
import OrderSummarySidebar from '../components/checkout/OrderSummarySidebar';
import { CreditCard, ShieldCheck, Smartphone, Landmark } from 'lucide-react';

const paymentOptions = [
  {
    value: 'Razorpay',
    label: 'Razorpay Secure',
    sub: 'Pay via Credit Card, UPI, Net Banking & more',
    icon: CreditCard,
    icons: (
      <div className="flex gap-2">
        <CreditCard size={20} strokeWidth={1.5} />
        <Smartphone size={20} strokeWidth={1.5} />
        <Landmark size={20} strokeWidth={1.5} />
      </div>
    ),
  },
];

const PaymentPage = () => {
  const cart = useSelector((state: RootState) => state.cart);
  const { shippingAddress, paymentMethod: defaultPaymentMethod } = cart;
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod || 'Razorpay');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (cart.totalPrice < 50000) {
      navigate('/cart');
    } else if (!shippingAddress.address) {
      navigate('/shipping');
    }
  }, [shippingAddress, cart.totalPrice, navigate]);

  const submitHandler = () => {
    dispatch(savePaymentMethod(paymentMethod));
    navigate('/placeorder');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0F0F10]">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <CheckoutSteps step1 step2 />

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 xl:gap-12 mt-2">

          {/* ── Left: Payment options ── */}
          <div className="w-full lg:w-[65%]">
            <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] overflow-hidden">
              <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                  Step 02 / 03
                </span>
                <h1 className="mt-2 text-[28px] sm:text-[32px] font-bold text-zinc-900 dark:text-white tracking-tight">
                  Payment Method
                </h1>
                <p className="mt-1 text-[15px] text-zinc-500 dark:text-zinc-400">
                  Choose how you'd like to pay
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
                      className={`relative w-full flex items-center gap-5 px-5 sm:px-6 py-5 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        isSelected
                          ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900/50 shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181B] hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm'
                      }`}
                    >
                      {/* Radio indicator */}
                      <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        isSelected ? 'border-zinc-900 dark:border-white' : 'border-zinc-300 dark:border-zinc-600'
                      }`}>
                        {isSelected && (
                          <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-white animate-fadeIn" />
                        )}
                      </span>

                      {/* Icon */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                        isSelected
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700'
                      }`}>
                        <Icon size={20} strokeWidth={1.5} />
                      </div>

                      {/* Label + Sub */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-bold tracking-tight transition-colors ${
                          isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'
                        }`}>
                          {option.label}
                        </p>
                        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">{option.sub}</p>
                      </div>

                      {/* Icons */}
                      <div className={`shrink-0 transition-colors ${
                        isSelected ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'
                      }`}>
                        {option.icons}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Reassurance */}
              <div className="flex items-center gap-2.5 px-6 sm:px-8 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" strokeWidth={2} />
                <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                  Every transaction is encrypted end-to-end with 256-bit SSL security
                </p>
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
