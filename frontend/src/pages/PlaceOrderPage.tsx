import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import CheckoutSteps from '../components/checkout/CheckoutSteps';
import OrderSummarySidebar from '../components/checkout/OrderSummarySidebar';
import { MapPin, CreditCard, ShoppingBag, Loader2, Pencil } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { clearCartItems } from '../store/slices/cartSlice';
import {
  useCreateOrderMutation,
  useCreateRazorpayOrderMutation,
  useVerifyRazorpayPaymentMutation,
} from '../store/slices/orderApiSlice';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const PlaceOrderPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const [createOrder, { isLoading }] = useCreateOrderMutation();
  const [createRazorpayOrder, { isLoading: isRazorpayLoading }] = useCreateRazorpayOrderMutation();
  const [verifyRazorpayPayment, { isLoading: isPaymentLoading }] = useVerifyRazorpayPaymentMutation();
  const [localError, setLocalError] = useState('');
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (cart.itemsPrice < 50000) {
      navigate('/cart');
    } else if (!cart.shippingAddress.address) {
      navigate('/shipping');
    } else if (!cart.paymentMethod) {
      navigate('/payment');
    }
  }, [cart.itemsPrice, cart.paymentMethod, cart.shippingAddress.address, navigate]);

  const placeOrderHandler = async () => {
    setLocalError('');
    if (!userInfo?.accessToken) {
      setLocalError('You need to sign in again before placing an order.');
      navigate('/login?redirect=/placeorder');
      return;
    }

    if (!Number.isFinite(cart.totalPrice) || cart.totalPrice < 1) {
      setLocalError(`Your order total must be at least ${formatCurrency(1)} before online payment can be created.`);
      return;
    }

    try {
      const items = cart.cartItems.map((item) => ({
        productId: item._id,
        quantity: item.qty,
      }));
      const res = await createOrder({
        items,
        totalAmount: cart.totalPrice,
        paymentMethod: 'Razorpay',
      }).unwrap();

      const orderId = res.order._id;

      const razorpayRes = await createRazorpayOrder(orderId).unwrap();

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        setLocalError('Failed to load Razorpay checkout. Please check your internet connection and try again.');
        return;
      }

      const options = {
        key: razorpayRes.keyId,
        amount: razorpayRes.gatewayOrder.amount,
        currency: razorpayRes.gatewayOrder.currency || 'INR',
        name: 'AutoTrade',
        description: `Order #${orderId}`,
        order_id: razorpayRes.gatewayOrder.id,
        handler: async (response: any) => {
          try {
            await verifyRazorpayPayment({
              orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }).unwrap();
            dispatch(clearCartItems());
            navigate(`/order/${orderId}`);
          } catch (err: any) {
            console.error('Payment verification failed:', err);
            setLocalError(
              err?.data?.message ||
              'Payment was collected but verification failed. Please contact support with your order ID: ' + orderId
            );
          }
        },
        prefill: {
          name: userInfo ? `${userInfo.firstName} ${userInfo.lastName}`.trim() : '',
          email: userInfo?.email || '',
          contact: userInfo?.phone || '',
        },
        notes: { order_id: orderId },
        theme: { color: '#000000' },
        modal: {
          confirm_close: true,
          handleback: true,
          ondismiss: () => {
            setLocalError('Payment was cancelled. Your order has been saved — you can complete payment from the order page.');
            navigate(`/order/${orderId}`);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        console.error('[Razorpay] Payment failed:', response.error);
        setLocalError(response.error?.description || 'Payment failed. Please try a different card or payment method.');
      });
      rzp.open();
    } catch (err: any) {
      console.error('Failed to place order:', err);
      setLocalError(err?.data?.message || 'Failed to place order. Please try again.');
    }
  };

  const isProcessing = isLoading || isRazorpayLoading || isPaymentLoading;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0F0F10]">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <CheckoutSteps step1 step2 step3 />

        {localError && (
          <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 text-sm font-semibold">
            {localError}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 xl:gap-12 mt-2">
          {/* Left: Review Details */}
          <div className="w-full lg:w-[65%] space-y-6">
            {/* Shipping */}
            <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] overflow-hidden">
              <div className="px-6 sm:px-8 py-5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-[18px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <MapPin size={18} className="text-zinc-400" strokeWidth={1.5} />
                  Shipping Address
                </h2>
                <Link to="/shipping" className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <Pencil size={14} strokeWidth={1.5} />
                  Edit
                </Link>
              </div>
              <div className="px-6 sm:px-8 py-5">
                <p className="text-[15px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {cart.shippingAddress.address}<br />
                  {cart.shippingAddress.city}, {cart.shippingAddress.postalCode}<br />
                  {cart.shippingAddress.country}<br />
                  {cart.shippingAddress.phone && <span className="text-zinc-500 dark:text-zinc-400 text-sm">{cart.shippingAddress.phone}</span>}
                </p>
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] overflow-hidden">
              <div className="px-6 sm:px-8 py-5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-[18px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <CreditCard size={18} className="text-zinc-400" strokeWidth={1.5} />
                  Payment Method
                </h2>
                <Link to="/payment" className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <Pencil size={14} strokeWidth={1.5} />
                  Edit
                </Link>
              </div>
              <div className="px-6 sm:px-8 py-5">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <CreditCard size={18} className="text-zinc-600 dark:text-zinc-400" strokeWidth={1.5} />
                  <span className="text-[15px] font-semibold text-zinc-900 dark:text-white">Razorpay Secure</span>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] overflow-hidden">
              <div className="px-6 sm:px-8 py-5 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-[18px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag size={18} className="text-zinc-400" strokeWidth={1.5} />
                  Items ({cart.cartItems.reduce((a, i) => a + i.qty, 0)})
                </h2>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {cart.cartItems.map((item) => (
                  <div key={`${item._id}-${item.variant.size}-${item.variant.color}`} className="px-6 sm:px-8 py-4 flex items-center gap-4">
                    <div className="w-[60px] h-[72px] shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-zinc-900 dark:text-white line-clamp-1">{item.name}</p>
                      <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase">
                        {item.variant.color} &middot; {item.variant.size} &middot; Qty: {item.qty}
                      </p>
                    </div>
                    <p className="text-[15px] font-bold text-zinc-900 dark:text-white shrink-0">{formatCurrency(item.price)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Summary + CTA */}
          <div className="w-full lg:w-[35%]">
            <OrderSummarySidebar
              buttonText={isProcessing ? 'Processing...' : 'Place Order'}
              buttonAction={placeOrderHandler}
              disableButton={isProcessing || cart.totalPrice < 1}
            />
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isLoading ? 'Sending your order…' : isRazorpayLoading ? 'Connecting to payment gateway…' : 'Verifying payment…'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrderPage;
