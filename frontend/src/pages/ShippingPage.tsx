import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { saveShippingAddress } from '../store/slices/cartSlice';
import CheckoutSteps from '../components/checkout/CheckoutSteps';
import OrderSummarySidebar from '../components/checkout/OrderSummarySidebar';
import { MapPin, Building2, Hash, Globe, Phone, Mail, User, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const InputField = ({
  id, label, value, onChange, icon, required, placeholder, type, autoComplete, isSubmitted
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  icon: React.ReactNode; required?: boolean; placeholder?: string;
  type?: string; autoComplete?: string; isSubmitted?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value.trim().length > 0;
  const isError = required && isSubmitted && !hasValue;

  return (
    <div className="relative group">
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 z-10 ${
        isError ? 'text-red-500' : focused || hasValue ? 'text-orange-500' : 'text-zinc-400 dark:text-zinc-500'
        }`}>
        {icon}
      </div>
      <input
        id={id}
        type={type || 'text'}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full h-[54px] pl-11 pr-4 rounded-xl border bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-900 dark:text-white text-left placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all duration-200 ${
          isError 
            ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' 
            : 'border-zinc-200 dark:border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20'
        }`}
        placeholder={focused ? '' : (placeholder || label)}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
      <label
        htmlFor={id}
        className={`absolute left-10 -top-2.5 px-1.5 text-[11px] font-bold uppercase tracking-wider bg-white dark:bg-zinc-900 transition-all duration-200 z-10 ${
          focused || hasValue
            ? `opacity-100 translate-y-0 ${isError ? 'text-red-500' : 'text-orange-500'}`
            : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
      >
        {label}{required && ' *'}
      </label>
    </div>
  );
};

const parsePrice = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const ShippingPage = () => {
  const cart = useSelector((state: RootState) => state.cart);
  const { userInfo } = useSelector((state: RootState) => state.auth);
  const { shippingAddress } = cart;
  const navigate = useNavigate();

  const calculatedItemsPrice = cart.itemsPrice > 0
    ? cart.itemsPrice
    : (cart.cartItems || []).reduce((acc: number, item: any) => acc + Math.round(parsePrice(item.price)) * item.qty, 0);

  useEffect(() => {
    if (!cart.cartItems || cart.cartItems.length === 0 || calculatedItemsPrice <= 0) {
      navigate('/cart');
    }
  }, [cart.cartItems, calculatedItemsPrice, navigate]);

  const currentUserId = userInfo?._id || userInfo?.id;
  const userSavedAddresses = currentUserId
    ? JSON.parse(localStorage.getItem(`savedAddresses_${currentUserId}`) || '[]')
    : [];
  const defaultSavedAddress = userSavedAddresses.find((a: any) => a.isDefault) || userSavedAddresses[0];

  const [firstName, setFirstName] = useState(() => {
    const rawFirst = userInfo?.firstName || (userInfo?.name ? userInfo.name.trim().split(/\s+/)[0] : '');
    return /^\d+$/.test((rawFirst || '').trim()) ? '' : (rawFirst || '');
  });
  const [lastName, setLastName] = useState(() => {
    const rawLast = userInfo?.lastName || (userInfo?.name ? userInfo.name.trim().split(/\s+/).slice(1).join(' ') : '');
    return /^\d+$/.test((rawLast || '').trim()) ? '' : (rawLast || '');
  });
  const [email, setEmail] = useState(() => userInfo?.email || '');
  const [address, setAddress] = useState(() => shippingAddress.address || defaultSavedAddress?.line1 || '');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState(() => shippingAddress.city || defaultSavedAddress?.line2 || '');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState(() => shippingAddress.postalCode || '');
  const [country, setCountry] = useState(() => shippingAddress.country || defaultSavedAddress?.country || 'India');
  const [phone, setPhone] = useState(() => shippingAddress.phone || userInfo?.phone || defaultSavedAddress?.phone || '');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const dispatch = useDispatch();

  const submitHandler = () => {
    setIsSubmitted(true);
    if (!isFormValid) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (/\d/.test(firstName.trim())) {
      toast.error('First Name should contain letters only, not numbers.');
      return;
    }
    if (/\d/.test(lastName.trim())) {
      toast.error('Last Name should contain letters only, not numbers.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }

    const fullLine1 = `${address}${address2 ? `, ${address2}` : ''}`;
    const fullLine2 = `${city}${state ? `, ${state}` : ''}`;

    dispatch(saveShippingAddress({
      address: fullLine1,
      city, state, province: state, postalCode, country, phone
    }));

    // Auto-sync address to user's Account -> Addresses list
    if (currentUserId) {
      const existingAddrs: any[] = JSON.parse(localStorage.getItem(`savedAddresses_${currentUserId}`) || '[]');
      const isAlreadySaved = existingAddrs.some((a: any) => a.line1 === fullLine1);
      if (!isAlreadySaved) {
        const newAddr = {
          id: `addr_${Date.now()}`,
          tag: 'HOME',
          name: `${firstName} ${lastName}`.trim() || userInfo?.name || 'Customer',
          line1: fullLine1,
          line2: fullLine2,
          state,
          country,
          phone,
          isDefault: existingAddrs.length === 0,
        };
        existingAddrs.push(newAddr);
        localStorage.setItem(`savedAddresses_${currentUserId}`, JSON.stringify(existingAddrs));
      }
    }

    navigate('/payment');
  };

  const isFormValid = firstName && lastName && email && address && city && state && postalCode && country && phone;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <CheckoutSteps step1 />

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 xl:gap-12 mt-6">

          {/* ── Left: Form ── */}
          <div className="w-full lg:w-[65%]">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-xl overflow-hidden backdrop-blur-md">
              {/* Header */}
              <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-zinc-100 dark:border-zinc-800/80">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20">
                  <Sparkles size={13} /> Step 01 of 03
                </span>
                <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Shipping Address
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Please enter your delivery address where should we send your order.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={(e) => { e.preventDefault(); submitHandler(); }}
                className="px-6 sm:px-8 py-6 space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <InputField
                    id="firstName" label="First Name" value={firstName} onChange={setFirstName}
                    icon={<User size={16} strokeWidth={1.75} />} required autoComplete="given-name" isSubmitted={isSubmitted}
                  />
                  <InputField
                    id="lastName" label="Last Name" value={lastName} onChange={setLastName}
                    icon={<User size={16} strokeWidth={1.75} />} required autoComplete="family-name" isSubmitted={isSubmitted}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <InputField
                    id="email" label="Email" value={email} onChange={setEmail}
                    icon={<Mail size={16} strokeWidth={1.75} />} required type="email" autoComplete="email" isSubmitted={isSubmitted}
                  />
                  <InputField
                    id="phone" label="Phone Number" value={phone} onChange={(val: string) => setPhone(val.replace(/[^\d+]/g, '').slice(0, 12))}
                    icon={<Phone size={16} strokeWidth={1.75} />} required type="tel" autoComplete="tel" isSubmitted={isSubmitted}
                  />
                </div>

                <InputField
                  id="address" label="Address Line 1" value={address} onChange={setAddress}
                  icon={<MapPin size={16} strokeWidth={1.75} />} required autoComplete="address-line1" isSubmitted={isSubmitted}
                />

                <InputField
                  id="address2" label="Address Line 2 (Optional)" value={address2} onChange={setAddress2}
                  icon={<MapPin size={16} strokeWidth={1.75} />} autoComplete="address-line2" isSubmitted={isSubmitted}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                  <InputField
                    id="city" label="City" value={city} onChange={setCity}
                    icon={<Building2 size={16} strokeWidth={1.75} />} required autoComplete="address-level2" isSubmitted={isSubmitted}
                  />
                  <InputField
                    id="state" label="State" value={state} onChange={setState}
                    icon={<Building2 size={16} strokeWidth={1.75} />} required autoComplete="address-level1" isSubmitted={isSubmitted}
                  />
                  <InputField
                    id="postalCode" label="Postal Code" value={postalCode} onChange={setPostalCode}
                    icon={<Hash size={16} strokeWidth={1.75} />} required autoComplete="postal-code" isSubmitted={isSubmitted}
                  />
                </div>

                <InputField
                  id="country" label="Country" value={country} onChange={setCountry}
                  icon={<Globe size={16} strokeWidth={1.75} />} required autoComplete="country-name" isSubmitted={isSubmitted}
                />

                <button type="submit" id="submit-shipping" className="hidden">Submit</button>
              </form>
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="w-full lg:w-[35%]">
            <OrderSummarySidebar
              buttonText="Continue to Payment"
              buttonAction={() => {
                setIsSubmitted(true);
                const btn = document.getElementById('submit-shipping');
                if (btn) btn.click();
              }}
              disableButton={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingPage;
