import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import CheckoutSteps from '../components/checkout/CheckoutSteps';
import OrderSummarySidebar from '../components/checkout/OrderSummarySidebar';
import { MapPin, CreditCard, ShoppingBag, Loader2, Pencil } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useCreateCheckoutSessionMutation, useCreateOrderMutation } from '../store/slices/orderApiSlice';

const PlaceOrderPage = () => {
  const navigate = useNavigate();
  const cart = useSelector((state: RootState) => state.cart);
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();
  const [createCheckoutSession, { isLoading: isCheckoutLoading }] = useCreateCheckoutSessionMutation();
  const [localError, setLocalError] = useState('');
  const { formatCurrency, currency } = useCurrency();

  useEffect(() => {
    if (!cart.cartItems || cart.cartItems.length === 0 || cart.totalPrice <= 0) {
      navigate('/cart');
    } else if (!cart.shippingAddress.address) {
      navigate('/shipping');
    } else if (!cart.paymentMethod) {
      navigate('/payment');
    }
  }, [cart.cartItems, cart.totalPrice, cart.paymentMethod, cart.shippingAddress.address, navigate]);

  const placeOrderHandler = async () => {
    const activeToken = userInfo?.accessToken || (userInfo as any)?.token || localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!userInfo || !activeToken) {
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
        vid: item.vid || undefined,
        sku: item.sku || undefined,
        color: item.variant?.color || undefined,
        size: item.variant?.size || undefined,
      }));

      const shippingDetails = {
        customerName: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim(),
        address: cart.shippingAddress.address,
        city: cart.shippingAddress.city,
        province: cart.shippingAddress.state || cart.shippingAddress.province || '',
        postalCode: cart.shippingAddress.postalCode,
        countryCode: cart.shippingAddress.countryCode || 'IN',
        country: cart.shippingAddress.country,
        zip: cart.shippingAddress.postalCode,
        phone: cart.shippingAddress.phone || userInfo.phone || '',
      };

      const orderRes = await createOrder({
        items,
        totalAmount: cart.totalPrice,
        currency,
        shippingDetails,
      }).unwrap();

      if (!orderRes?.order?._id) {
        throw new Error('Failed to create order');
      }

      const res = await createCheckoutSession({
        orderId: orderRes.order._id,
      }).unwrap();

      if (!res?.checkoutUrl) {
        throw new Error('Payment session could not be created');
      }

      window.location.href = res.checkoutUrl;
    } catch (err: any) {
      console.error('Failed to place order:', err);
      setLocalError(err?.data?.message || 'Failed to place order. Please try again.');
    }
  };

  const isProcessing = isCreatingOrder || isCheckoutLoading;

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
                  <span className="text-[15px] font-semibold text-zinc-900 dark:text-white">Stripe Secure</span>
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
                {cart.cartItems.map((item, idx) => (
                  <div key={`${item._id || idx}-${item.variant?.size || 'std'}-${item.variant?.color || 'default'}`} className="px-6 sm:px-8 py-4 flex items-center gap-4">
                    <div className="w-[60px] h-[72px] shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-zinc-900 dark:text-white line-clamp-1">{item.name}</p>
                      <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase">
                        {item.variant?.color || 'DEFAULT'} &middot; {item.variant?.size || 'ONE SIZE'} &middot; Qty: {item.qty}
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
                Redirecting to secure checkout…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrderPage;
