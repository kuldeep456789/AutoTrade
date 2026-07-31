import { useState, useEffect } from 'react';
import { X, MapPinHouse, Phone, Building2, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export interface AddressData {
  id?: string;
  tag?: string;
  name: string;
  line1: string;
  line2: string;
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

const EditAddressModal = ({ isOpen, onClose, address, title = 'Edit Address', onSave }: EditAddressModalProps) => {
  const [formData, setFormData] = useState<AddressData>(() => ({
    tag: address?.tag || 'HOME',
    name: address?.name || '',
    line1: address?.line1 || '',
    line2: address?.line2 || '',
    country: address?.country || 'India',
    phone: address?.phone || '',
    isDefault: address?.isDefault || false,
    id: address?.id,
  }));

  useEffect(() => {
    if (isOpen) {
      setFormData({
        tag: address?.tag || 'HOME',
        name: address?.name || '',
        line1: address?.line1 || '',
        line2: address?.line2 || '',
        country: address?.country || 'India',
        phone: address?.phone || '',
        isDefault: address?.isDefault || false,
        id: address?.id,
      });
    }
  }, [isOpen, address]);

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.line1.trim() || !formData.line2.trim() || !formData.country.trim() || !formData.phone.trim()) {
      toast.error('Please fill out all fields.');
      return;
    }

    if (/\d/.test(formData.name.trim())) {
      toast.error('Full Name should contain letters only, not numbers.');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }

    onSave(formData);
    toast.success('Address saved successfully!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Full Name</label>
            <div className="relative">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-[48px] px-4 rounded-xl border border-zinc-200 dark:border-[#2A2A2A] bg-zinc-50 dark:bg-[#0F0F10] text-zinc-900 dark:text-white text-[15px] outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all"
                placeholder="Kuldeep Vyas"
              />
            </div>
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Address Line 1</label>
            <div className="relative">
              <MapPinHouse size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
              <input
                type="text"
                value={formData.line1}
                onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                className="w-full h-[48px] pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-[#2A2A2A] bg-zinc-50 dark:bg-[#0F0F10] text-zinc-900 dark:text-white text-[15px] outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all"
                placeholder="19 Residency Road"
              />
            </div>
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">City, State, PIN Code</label>
            <div className="relative">
              <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
              <input
                type="text"
                value={formData.line2}
                onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                className="w-full h-[48px] pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-[#2A2A2A] bg-zinc-50 dark:bg-[#0F0F10] text-zinc-900 dark:text-white text-[15px] outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all"
                placeholder="Bengaluru, Karnataka 560025"
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Country</label>
            <div className="relative">
              <Globe size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full h-[48px] pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-[#2A2A2A] bg-zinc-50 dark:bg-[#0F0F10] text-zinc-900 dark:text-white text-[15px] outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all"
                placeholder="India"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^\d+\s-]/g, '').slice(0, 15) })}
                className="w-full h-[48px] pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-[#2A2A2A] bg-zinc-50 dark:bg-[#0F0F10] text-zinc-900 dark:text-white text-[15px] outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Default Checkbox */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="isDefaultCheck"
              checked={formData.isDefault || false}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer"
            />
            <label htmlFor="isDefaultCheck" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
              Set as default address
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-[#2A2A2A]">
          <button
            onClick={onClose}
            className="h-[48px] px-6 rounded-xl border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-[15px] font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="h-[48px] px-6 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 active:scale-[0.98] shadow-sm flex items-center gap-2"
          >
            Save Address
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAddressModal;
