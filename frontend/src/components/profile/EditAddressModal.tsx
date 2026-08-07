import { useState, useEffect } from 'react';
import { X, MapPin, Phone, Building2, Globe, User, Hash, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export interface AddressData {
  id?: string;
  tag?: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
}

interface EditAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: AddressData;
  title?: string;
  onSave: (newAddress: AddressData) => void;
}

const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates', 'Singapore'];

const EditAddressModal = ({ isOpen, onClose, address, title = 'Edit Address', onSave }: EditAddressModalProps) => {
  const [formData, setFormData] = useState<AddressData>(() => ({
    tag: address?.tag || 'HOME',
    name: address?.name || '',
    line1: address?.line1 || '',
    line2: address?.line2 || '',
    city: address?.city || '',
    state: address?.state || '',
    postalCode: address?.postalCode || '',
    country: address?.country || 'India',
    phone: address?.phone || '',
    isDefault: address?.isDefault || false,
    id: address?.id,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cleanPhone = (address?.phone || '').replace(/\D/g, '').slice(0, 10);
      const cleanPostal = (address?.postalCode || '').replace(/\D/g, '').slice(0, 6);
      
      setFormData({
        tag: address?.tag || 'HOME',
        name: address?.name || '',
        line1: address?.line1 || '',
        line2: address?.line2 || '',
        city: address?.city || '',
        state: address?.state || '',
        postalCode: cleanPostal,
        country: address?.country || 'India',
        phone: cleanPhone,
        isDefault: address?.isDefault || false,
        id: address?.id,
      });

      const initialErrors: Record<string, string> = {};
      if (address?.phone && cleanPhone.length !== 10) {
        initialErrors.phone = 'Please enter a valid 10-digit mobile number.';
      }
      if (address?.postalCode && cleanPostal.length !== 6) {
        initialErrors.postalCode = 'Please enter a valid 6-digit postal code.';
      }
      setErrors(initialErrors);
    }
  }, [isOpen, address]);

  // Handle Full Name Input (letters & spaces only)
  const handleNameChange = (val: string) => {
    const cleanName = val.replace(/[^A-Za-z\s'-]/g, '').slice(0, 60);
    setFormData((prev) => ({ ...prev, name: cleanName }));

    if (cleanName.trim().length > 0 && cleanName.trim().length < 3) {
      setErrors((prev) => ({ ...prev, name: 'Full Name must be at least 3 characters.' }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  };

  // Handle Phone Number Input (digits only, max 10)
  const handlePhoneChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: digitsOnly }));

    if (digitsOnly.length > 0 && digitsOnly.length < 10) {
      setErrors((prev) => ({ ...prev, phone: 'Please enter a valid 10-digit mobile number.' }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  // Handle Postal Code Input (digits only, max 6)
  const handlePostalCodeChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({ ...prev, postalCode: digitsOnly }));

    if (digitsOnly.length > 0 && digitsOnly.length < 6) {
      setErrors((prev) => ({ ...prev, postalCode: 'Please enter a valid 6-digit postal code.' }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.postalCode;
        return next;
      });
    }
  };

  // Handle Address Line 1 Input
  const handleLine1Change = (val: string) => {
    const cleanLine = val.slice(0, 120);
    setFormData((prev) => ({ ...prev, line1: cleanLine }));

    if (cleanLine.trim().length > 0 && cleanLine.trim().length < 5) {
      setErrors((prev) => ({ ...prev, line1: 'Address Line 1 must be at least 5 characters.' }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.line1;
        return next;
      });
    }
  };

  // Handle City Input (letters & spaces only)
  const handleCityChange = (val: string) => {
    const cleanCity = val.replace(/[^A-Za-z\s]/g, '').slice(0, 50);
    setFormData((prev) => ({ ...prev, city: cleanCity }));

    if (cleanCity.trim().length > 0 && cleanCity.trim().length < 2) {
      setErrors((prev) => ({ ...prev, city: 'Please enter a valid city name.' }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.city;
        return next;
      });
    }
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameClean = formData.name.trim();
    if (!nameClean || nameClean.length < 3) {
      newErrors.name = 'Please enter a valid full name (min 3 characters).';
    }

    if (!formData.phone || formData.phone.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    const line1Clean = formData.line1.trim();
    if (!line1Clean || line1Clean.length < 5) {
      newErrors.line1 = 'Address Line 1 is required (min 5 characters).';
    }

    const cityClean = formData.city.trim();
    if (!cityClean || cityClean.length < 2) {
      newErrors.city = 'Please enter a valid city name.';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'Please select a state.';
    }

    if (!formData.postalCode || formData.postalCode.length !== 6) {
      newErrors.postalCode = 'Please enter a valid 6-digit postal code.';
    }

    if (!formData.country.trim()) {
      newErrors.country = 'Please select a country.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateAll()) return;

    setIsSaving(true);
    try {
      onSave(formData);
      onClose();
    } catch {
      toast.error('Failed to save address. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid =
    formData.name.trim().length >= 3 &&
    formData.phone.length === 10 &&
    formData.line1.trim().length >= 5 &&
    formData.city.trim().length >= 2 &&
    formData.state.trim().length > 0 &&
    formData.postalCode.length === 6 &&
    formData.country.trim().length > 0 &&
    Object.keys(errors).length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-xl bg-white dark:bg-[#16161A] rounded-3xl border border-zinc-200/80 dark:border-white/[0.1] shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-zinc-100 dark:border-white/[0.08]">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">{title}</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Enter shipping address and recipient details.</p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all cursor-pointer"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 sm:px-8 py-6 space-y-6 max-h-[70vh] overflow-y-auto">

              {/* Tag Selector (HOME / OFFICE) */}
              <div className="flex items-center gap-3 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Address Type:</span>
                {['HOME', 'OFFICE', 'OTHER'].map((tagOption) => (
                  <button
                    key={tagOption}
                    type="button"
                    onClick={() => setFormData({ ...formData, tag: tagOption })}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${formData.tag === tagOption
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                  >
                    {tagOption}
                  </button>
                ))}
              </div>

              {/* Personal Information */}
              <div className="space-y-4 pt-1">
                <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider">Recipient Contact</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className={`w-full h-12 pl-10 pr-4 rounded-xl border ${errors.name ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-white/[0.08] focus:border-orange-500 focus:ring-orange-500/20'} bg-zinc-50 dark:bg-[#0F0F12] text-zinc-900 dark:text-white text-sm font-medium outline-none focus:ring-2 transition-all`}
                        placeholder="Kuldeep Vyas"
                      />
                    </div>
                    {errors.name && <p className="mt-1.5 text-xs text-rose-500 font-semibold">{errors.name}</p>}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Phone Number
                      </label>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${formData.phone.length === 10 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                        {formData.phone.length} / 10
                      </span>
                    </div>
                    <div className="relative">
                      <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className={`w-full h-12 pl-10 pr-4 rounded-xl border ${errors.phone ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-white/[0.08] focus:border-orange-500 focus:ring-orange-500/20'} bg-zinc-50 dark:bg-[#0F0F12] text-zinc-900 dark:text-white text-sm font-medium outline-none focus:ring-2 transition-all`}
                        placeholder="9876543210"
                      />
                    </div>
                    {errors.phone && <p className="mt-1.5 text-xs text-rose-500 font-semibold">{errors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-white/[0.06]">
                <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider">Address Details</h3>

                {/* Address Line 1 */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Address Line 1
                  </label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
                    <input
                      type="text"
                      value={formData.line1}
                      onChange={(e) => handleLine1Change(e.target.value)}
                      className={`w-full h-12 pl-10 pr-4 rounded-xl border ${errors.line1 ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-white/[0.08] focus:border-orange-500 focus:ring-orange-500/20'} bg-zinc-50 dark:bg-[#0F0F12] text-zinc-900 dark:text-white text-sm font-medium outline-none focus:ring-2 transition-all`}
                      placeholder="House/Flat No., Building, Street Name"
                    />
                  </div>
                  {errors.line1 && <p className="mt-1.5 text-xs text-rose-500 font-semibold">{errors.line1}</p>}
                </div>

                {/* Address Line 2 */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Address Line 2 (Optional)
                  </label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
                    <input
                      type="text"
                      value={formData.line2}
                      onChange={(e) => setFormData({ ...formData, line2: e.target.value.slice(0, 120) })}
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 bg-zinc-50 dark:bg-[#0F0F10] text-zinc-900 dark:text-white text-sm font-medium outline-none transition-all"
                      placeholder="Apartment, suite, landmark, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* City */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      City
                    </label>
                    <div className="relative">
                      <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleCityChange(e.target.value)}
                        className={`w-full h-12 pl-10 pr-4 rounded-xl border ${errors.city ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-white/[0.08] focus:border-orange-500 focus:ring-orange-500/20'} bg-zinc-50 dark:bg-[#0F0F12] text-zinc-900 dark:text-white text-sm font-medium outline-none focus:ring-2 transition-all`}
                        placeholder="Bengaluru"
                      />
                    </div>
                    {errors.city && <p className="mt-1.5 text-xs text-rose-500 font-semibold">{errors.city}</p>}
                  </div>

                  {/* State Select Dropdown */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      State
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className={`w-full h-12 px-4 rounded-xl border ${errors.state ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-white/[0.08] focus:border-orange-500 focus:ring-orange-500/20'} bg-zinc-50 dark:bg-[#0F0F12] text-zinc-900 dark:text-white text-sm font-medium outline-none focus:ring-2 transition-all cursor-pointer`}
                    >
                      <option value="" disabled>Select State</option>
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                          {st}
                        </option>
                      ))}
                    </select>
                    {errors.state && <p className="mt-1.5 text-xs text-rose-500 font-semibold">{errors.state}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Postal Code */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Postal Code
                      </label>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${formData.postalCode.length === 6 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                        {formData.postalCode.length} / 6
                      </span>
                    </div>
                    <div className="relative">
                      <Hash size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={formData.postalCode}
                        onChange={(e) => handlePostalCodeChange(e.target.value)}
                        className={`w-full h-12 pl-10 pr-4 rounded-xl border ${errors.postalCode ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-white/[0.08] focus:border-orange-500 focus:ring-orange-500/20'} bg-zinc-50 dark:bg-[#0F0F12] text-zinc-900 dark:text-white text-sm font-medium outline-none focus:ring-2 transition-all`}
                        placeholder="560025"
                      />
                    </div>
                    {errors.postalCode && <p className="mt-1.5 text-xs text-rose-500 font-semibold">{errors.postalCode}</p>}
                  </div>

                  {/* Country Select Dropdown */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Country
                    </label>
                    <div className="relative">
                      <Globe size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" strokeWidth={2} />
                      <select
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className={`w-full h-12 pl-10 pr-4 rounded-xl border ${errors.country ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-white/[0.08] focus:border-orange-500 focus:ring-orange-500/20'} bg-zinc-50 dark:bg-[#0F0F12] text-zinc-900 dark:text-white text-sm font-medium outline-none focus:ring-2 transition-all cursor-pointer`}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.country && <p className="mt-1.5 text-xs text-rose-500 font-semibold">{errors.country}</p>}
                  </div>
                </div>

                {/* Default Checkbox */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isDefaultCheck"
                    checked={formData.isDefault || false}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4.5 h-4.5 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
                  />
                  <label htmlFor="isDefaultCheck" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                    Set as default shipping address
                  </label>
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 sm:px-8 py-4 border-t border-zinc-100 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="h-11 px-5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving || !isFormValid}
                className="h-11 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving Address...
                  </>
                ) : (
                  <>
                    <CheckCircle size={15} />
                    Save Address
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditAddressModal;
