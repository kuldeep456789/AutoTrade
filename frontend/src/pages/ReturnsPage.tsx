import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { useCreateReturnMutation, useGetMyReturnsQuery } from '../store/slices/returnApiSlice';
import { Check, X, ChevronRight, ChevronDown, RotateCcw, Clock, AlertCircle, PackageCheck, PackageX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const RETURN_REASONS = [
  'Wrong Size', 'Poor Fit', 'Damaged Item', 'Missing Product',
  'Color Mismatch', 'Quality Issue', 'Wrong Item Received',
  'Changed Mind', 'Late Delivery', 'Other',
];

const STATUS_STEPS = [
  { key: 'requested', label: 'Requested', icon: RotateCcw },
  { key: 'approved', label: 'Approved', icon: Check },
  { key: 'item_not_received', label: 'Item Not Received', icon: PackageX },
  { key: 'item_received', label: 'Item Received', icon: PackageCheck },
  { key: 'not_refunded', label: 'Not Refunded', icon: AlertCircle },
  { key: 'refunded', label: 'Refunded', icon: Check },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

const getStatusIndex = (status: string) => {
  if (!status) return 0;
  const s = String(status).toLowerCase().trim().replace(/[\s_-]+/g, '');

  if (s === 'refunded' || s === 'refundcompleted' || s === 'completed') return 5;
  if (s === 'notrefunded') return 4;
  if (s === 'itemreceived') return 3;
  if (s === 'itemnotreceived') return 2;
  if (s === 'approved') return 1;
  if (s === 'requested' || s === 'returnrequested' || s === 'pending') return 0;

  const idx = STATUS_ORDER.indexOf(status.toLowerCase());
  return idx >= 0 ? idx : 0;
};

const shortOrderId = (id: string) => {
  if (!id) return '';
  if (id.length > 8 && /^[0-9a-fA-F]+$/.test(id)) {
    return `#${id.slice(-8).toUpperCase()}`;
  }
  return id.startsWith('#') ? id : `#${id}`;
};

const nonReturnable = ['Innerwear', 'Accessories', 'Gift Cards', 'Final Sale Items'];

const ReturnsPage = () => {
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  if (!userInfo) {
    return <Navigate to="/login?redirect=/returns" replace />;
  }

  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [faqOpen, setFaqOpen] = useState<string | null>(null);
  const [createReturn, { isLoading: isSubmitting }] = useCreateReturnMutation();
  const { data: myReturns = [], isLoading: returnsLoading, refetch } = useGetMyReturnsQuery(undefined, { skip: !userInfo, pollingInterval: 3000 });

  // Form state
  const [orderId, setOrderId] = useState('');
  const [productId, setProductId] = useState('N/A');
  const [productName, setProductName] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productSize, setProductSize] = useState('');
  const [productColor, setProductColor] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [exchangeSize, setExchangeSize] = useState('');
  const [pickupStreet, setPickupStreet] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupState, setPickupState] = useState('');
  const [pickupPincode, setPickupPincode] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<string | null>(null);

  const handleAddImage = () => {
    if (imageUrl.trim() && !images.includes(imageUrl.trim())) {
      setImages((prev) => [...prev, imageUrl.trim()]);
      setImageUrl('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (!images.includes(base64String)) {
          setImages((prev) => [...prev, base64String]);
        }
      };
      reader.readAsDataURL(file);
    }
    // reset input
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!orderId || !productName || !reason) {
      setFormError('Order ID, Product Name, and Reason are required.');
      return;
    }
    if (!pickupStreet || !pickupCity || !pickupState || !pickupPincode || !pickupPhone) {
      setFormError('Please complete the pickup address fields.');
      return;
    }
    const cleanPhone = pickupPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Please enter a valid 10-digit pickup phone number.');
      return;
    }
    try {
      const body: any = {
        orderId,
        productId,
        productName,
        reason,
        description,
        images,
        pickupAddress: {
          street: pickupStreet,
          city: pickupCity,
          state: pickupState,
          pincode: pickupPincode,
          phone: pickupPhone,
        },
      };
      if (productImage) body.productImage = productImage;
      if (productSize) body.productSize = productSize;
      if (productColor) body.productColor = productColor;
      if (exchangeSize) body.exchangeSize = exchangeSize;

      await createReturn(body).unwrap();
      setSuccessMsg('Return request submitted successfully! Our support team will review your request shortly.');
      toast.success('Return request submitted successfully!');
      setOrderId(''); setProductId(''); setProductName(''); setProductImage('');
      setProductSize(''); setProductColor(''); setReason(''); setDescription('');
      setImages([]); setExchangeSize(''); setPickupStreet(''); setPickupCity('');
      setPickupState(''); setPickupPincode(''); setPickupPhone('');
      refetch();
      window.scrollTo({ top: 100, behavior: 'smooth' });
      setTimeout(() => setSuccessMsg(''), 15000);
    } catch (err: any) {
      setFormError(err?.data?.message || 'Failed to submit return request.');
    }
  };

  const faqs = [
    { q: 'How long does a refund take?', a: 'Refunds are processed within 3–5 business days for original payment methods, and instantly for wallet credits.' },
    { q: 'Can I exchange a size?', a: 'Yes! Select the "Exchange Size" option in the return form and choose your preferred size. We\'ll ship the replacement after the pickup is completed.' },
    { q: 'Can I return sale items?', a: 'Final sale items, innerwear, and accessories are non-returnable. All other sale items follow the standard 7-day return policy.' },
    { q: 'How do I cancel a return?', a: 'Contact our support team within 24 hours of submitting the request to cancel. Once pickup is scheduled, cancellation may not be possible.' },
    { q: 'Who pays for return shipping?', a: 'Return shipping is free for all eligible items. We\'ll provide a free pickup from your address.' },
    { q: 'Can I return multiple products?', a: 'Yes, you can submit separate return requests for each product in your order. Each request is handled individually.' },
  ];

  return (
    <div className="bg-[hsl(var(--background))] min-h-screen text-[hsl(var(--foreground))]">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-6">
          <Link to="/" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">HOME</Link>
          <ChevronRight size={10} strokeWidth={2.5} />
          <span className="text-zinc-700 dark:text-zinc-300">RETURNS</span>
        </div>

        <h1 className="text-[32px] sm:text-[38px] lg:text-[44px] font-bold leading-[1.1] mb-3">Returns & Refunds</h1>
        <p className="text-[15px] text-zinc-500 mb-8 max-w-xl">Hassle-free returns within 7 days of delivery. Start a return or track an existing request.</p>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
          {[
            { key: 'form', label: 'Start a Return' },
            ...(userInfo ? [{ key: 'history', label: 'My Returns' }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-5 py-2.5 rounded-lg text-[13px] font-bold tracking-wide transition-all duration-200 cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-zinc-500 hover:text-[hsl(var(--foreground))]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">


          {/* ───── TAB: FORM ───── */}
          {activeTab === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {!userInfo ? (
                <div className="text-center py-12 bg-[hsl(var(--card))] border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <AlertCircle size={32} strokeWidth={1.5} className="mx-auto mb-3 text-zinc-400" />
                  <p className="text-[16px] font-bold mb-2">Please Log In</p>
                  <p className="text-[13px] text-zinc-500 mb-6">You must be logged in to submit a return request.</p>
                  <Link to="/login" className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-bold tracking-wide hover:opacity-90 transition-opacity">
                    Log In
                  </Link>
                </div>
              ) : (
                <>
                  {/* Eligibility Badge */}
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <Check size={16} strokeWidth={3} className="text-green-600" />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-green-700 dark:text-green-400">Eligible for Return</p>
                  <p className="text-[12px] text-green-600/70 dark:text-green-400/70">7 Days Return Window · Items must be unused with tags attached</p>
                </div>
              </div>

              {successMsg && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-5 sm:p-6 mb-6 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                    <Check size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">Return Request Submitted Successfully!</h3>
                    <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300/90 mt-1 leading-relaxed">
                      Thank you for submitting your request. Our support team will review your details and contact you shortly. You can also track your return progress anytime under the <strong className="cursor-pointer underline" onClick={() => setActiveTab('history')}>My Returns</strong> tab.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="bg-[hsl(var(--card))] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <h2 className="text-[16px] font-bold mb-6">Return Request Form</h2>

                {formError && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 mb-5 flex items-center gap-2">
                    <X size={14} strokeWidth={2.5} className="text-red-600 shrink-0" />
                    <span className="text-[12px] font-semibold text-red-600">{formError}</span>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block">Order ID *</label>
                    <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="e.g. ORDER-12345" className="w-full h-[44px] px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-[13px] focus:outline-none focus:border-[hsl(var(--foreground))]" />
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block">Product Name *</label>
                    <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" className="w-full h-[44px] px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-[13px] focus:outline-none focus:border-[hsl(var(--foreground))]" />
                  </div>



                </div>

                {/* Reason */}
                <div className="mb-5">
                  <label className="text-[12px] font-semibold mb-1.5 block">Reason for Return *</label>
                  <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-[44px] px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-[hsl(var(--card))] text-[13px] focus:outline-none focus:border-[hsl(var(--foreground))]">
                    <option value="">Select a reason</option>
                    {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Description */}
                <div className="mb-5">
                  <label className="text-[12px] font-semibold mb-1.5 block">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the issue..." className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-[13px] focus:outline-none focus:border-[hsl(var(--foreground))] resize-none" />
                </div>

                {/* Image Upload */}
                <div className="mb-5">
                  <label className="text-[12px] font-semibold mb-1.5 block">Upload Images</label>
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileUpload} 
                      className="flex-1 h-[44px] px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-[13px] focus:outline-none focus:border-[hsl(var(--foreground))] file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300 hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700 cursor-pointer"
                    />
                  </div>
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {images.map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          <button type="button" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <X size={10} strokeWidth={3} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>



                {/* Pickup Address */}
                <div className="mb-6">
                  <label className="text-[12px] font-semibold mb-3 block">Pickup Address *</label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input value={pickupStreet} onChange={(e) => setPickupStreet(e.target.value)} placeholder="Street Address *" className="sm:col-span-2 h-[44px] px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-[13px] focus:outline-none focus:border-[hsl(var(--foreground))]" />
                    <input value={pickupCity} onChange={(e) => setPickupCity(e.target.value)} placeholder="City *" className="h-[44px] px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-[13px] focus:outline-none focus:border-[hsl(var(--foreground))]" />
                    <input value={pickupState} onChange={(e) => setPickupState(e.target.value)} placeholder="State *" className="h-[44px] px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-[13px] focus:outline-none focus:border-[hsl(var(--foreground))]" />
                    <input value={pickupPincode} onChange={(e) => setPickupPincode(e.target.value)} placeholder="Pincode *" className="h-[44px] px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-[13px] focus:outline-none focus:border-[hsl(var(--foreground))]" />
                    <input type="tel" value={pickupPhone} onChange={(e) => setPickupPhone(e.target.value.replace(/[^\d+\s-]/g, '').slice(0, 15))} placeholder="Phone *" className="h-[44px] px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-[13px] focus:outline-none focus:border-[hsl(var(--foreground))]" />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full h-[52px] rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[14px] font-bold tracking-wide hover:opacity-90 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? 'Submitting...' : 'Submit Return Request'}
                </button>
              </form>
                </>
              )}
            </motion.div>
          )}

          {/* ───── TAB: HISTORY ───── */}
          {activeTab === 'history' && userInfo && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {returnsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}
                </div>
              ) : myReturns.length === 0 ? (
                <div className="text-center py-12 bg-[hsl(var(--card))] border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <RotateCcw size={32} strokeWidth={1.5} className="mx-auto mb-3 text-zinc-300" />
                  <p className="text-[16px] font-semibold mb-1">No return requests yet</p>
                  <p className="text-[13px] text-zinc-500">Start a return from the form above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myReturns.map((ret: any) => {
                    const isExpanded = selectedReturn === ret._id;
                    const stepIdx = getStatusIndex(ret.status);
                    const isRejected = ret.status === 'rejected';
                    return (
                      <div key={ret._id} className="bg-[hsl(var(--card))] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                        <button
                          onClick={() => setSelectedReturn(isExpanded ? null : ret._id)}
                          className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isRejected ? 'bg-red-100 dark:bg-red-900/20 text-red-600' : 'bg-green-100 dark:bg-green-900/20 text-green-600'
                            }`}>
                              {isRejected ? <X size={18} strokeWidth={2} /> : <RotateCcw size={18} strokeWidth={1.5} />}
                            </div>
                            <div>
                              <p className="text-[14px] font-semibold">{ret.productName}</p>
                              <p className="text-[12px] text-zinc-500">Order: {shortOrderId(ret.orderId)} · {new Date(ret.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[11px] font-bold px-3 py-1 rounded-lg ${
                              isRejected ? 'bg-red-100 dark:bg-red-900/20 text-red-600' :
                              stepIdx === 5 || ['refunded', 'refund_completed', 'completed'].includes(String(ret.status).toLowerCase()) ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' :
                              'bg-amber-100 dark:bg-amber-900/20 text-amber-600'
                            }`}>
                              {ret.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </span>
                            <ChevronDown size={16} strokeWidth={2} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && !isRejected && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800">
                              <div className="p-4 sm:p-5">
                                {/* Timeline */}
                                <div className="relative mb-5">
                                  {STATUS_STEPS.map((step, i) => {
                                    const isActive = i <= stepIdx;
                                    const isLast = i === STATUS_STEPS.length - 1;
                                    return (
                                      <div key={step.key} className="flex items-start gap-3 relative pb-5 last:pb-0">
                                        {!isLast && (
                                          <div className={`absolute left-[15px] top-[34px] w-[2px] h-[calc(100%-34px)] ${isActive ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
                                        )}
                                        <div className={`w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${
                                          isActive ? 'bg-green-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                        }`}>
                                          <step.icon size={14} strokeWidth={2.5} />
                                        </div>
                                        <div className="pt-1.5">
                                          <p className={`text-[13px] font-semibold ${isActive ? 'text-[hsl(var(--foreground))]' : 'text-zinc-400'}`}>{step.label}</p>
                                          {isActive && i === stepIdx && (
                                            <p className="text-[11px] text-green-600 font-medium mt-0.5">Current stage</p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Details */}
                                <div className="grid sm:grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4">
                                  <div>
                                    <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Reason</p>
                                    <p className="text-[13px] font-medium mt-0.5">{ret.reason}</p>
                                  </div>
                                  {ret.description && (
                                    <div>
                                      <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Description</p>
                                      <p className="text-[13px] font-medium mt-0.5">{ret.description}</p>
                                    </div>
                                  )}
                                  {ret.exchangeSize && (
                                    <div>
                                      <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Exchange Size</p>
                                      <p className="text-[13px] font-medium mt-0.5">{ret.exchangeSize}</p>
                                    </div>
                                  )}
                                  {ret.refundAmount != null && (
                                    <div>
                                      <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Refund Amount</p>
                                      <p className="text-[13px] font-medium mt-0.5 text-green-600 font-bold">₹{ret.refundAmount}</p>
                                    </div>
                                  )}
                                  {ret.pickupDate && (
                                    <div>
                                      <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Pickup Date</p>
                                      <p className="text-[13px] font-medium mt-0.5">{new Date(ret.pickupDate).toLocaleDateString()}</p>
                                    </div>
                                  )}
                                  {ret.adminRemarks && (
                                    <div className="sm:col-span-2">
                                      <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Admin Remarks</p>
                                      <p className="text-[13px] font-medium mt-0.5 text-zinc-500 italic">{ret.adminRemarks}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {isExpanded && isRejected && (
                          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <X size={16} strokeWidth={2.5} className="text-red-600 shrink-0" />
                                <span className="text-[13px] font-bold text-red-600">Return Request Rejected</span>
                              </div>
                              {ret.adminRemarks && <p className="text-[12px] text-red-600/70">{ret.adminRemarks}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReturnsPage;
