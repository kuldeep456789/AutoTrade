import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { X, Loader2, User, Mail, Phone, Camera, Trash2 } from 'lucide-react';
import { useUpdateProfileMutation } from '../../store/slices/userApiSlice';
import { setCredentials } from '../../store/slices/authSlice';
import type { UserInfo } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo;
}

const EditProfileModal = ({ isOpen, onClose, user }: EditProfileModalProps) => {
  const dispatch = useDispatch();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && user) {
      setName(user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : user.name || '');
      setEmail(user.email);
      const cleanInitialPhone = (user.phone || '').replace(/\D/g, '').slice(0, 10);
      setPhone(cleanInitialPhone);
      setAvatar(user.avatar || (user as any).image || user.profileImage || null);
      
      const initialErrors: Record<string, string> = {};
      if (user.phone && cleanInitialPhone.length !== 10) {
        initialErrors.phone = 'Please update your mobile number to a valid 10-digit number.';
      }
      setErrors(initialErrors);
    }
  }, [isOpen, user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);

    if (digitsOnly.length > 0 && digitsOnly.length < 10) {
      setErrors((prev) => ({
        ...prev,
        phone: 'Please enter a valid 10-digit mobile number.',
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email address';

    if (!phone || phone.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const res = await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        avatar: avatar || undefined,
      }).unwrap();
      const updatedUser = {
        ...user,
        ...res.user,
        avatar: avatar || res.user.avatar || user.avatar,
        _id: res.user._id || res.user.id || user._id,
        accessToken: user.accessToken,
      };
      dispatch(setCredentials(updatedUser));
      toast.success('Profile updated successfully.');
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Unable to update profile. Please try again.');
    }
  };

  const isFormValid = name.trim().length > 0 && email.trim().length > 0 && phone.length === 10 && !errors.name && !errors.email;

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
            className="relative w-full max-w-lg bg-white dark:bg-[#16161A] rounded-3xl border border-zinc-200/80 dark:border-white/[0.1] shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-zinc-100 dark:border-white/[0.08]">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Edit Profile</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Update your personal details and mobile number.</p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all cursor-pointer"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 sm:px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center justify-center pb-2">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to change profile photo"
                >
                  <div className="w-24 h-24 rounded-full border-4 border-zinc-200/80 dark:border-white/[0.1] bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-extrabold text-3xl shadow-inner group-hover:border-orange-500 transition-colors">
                    {avatar ? (
                      <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      (name[0] || user?.email?.[0] || 'U').toUpperCase()
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[2px]">
                    <Camera size={22} />
                  </div>
                  <div className="absolute bottom-0 right-0 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-[#16161A]">
                    <Camera size={13} />
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-orange-500 hover:underline cursor-pointer"
                  >
                    {avatar ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {avatar && (
                    <>
                      <span className="text-zinc-400 text-xs">•</span>
                      <button
                        type="button"
                        onClick={() => setAvatar(null)}
                        className="text-xs font-bold text-rose-500 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full h-12 pl-10 pr-4 rounded-xl border ${errors.name ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-white/[0.08] focus:border-orange-500 focus:ring-orange-500/20'} bg-zinc-50 dark:bg-[#0F0F12] text-zinc-900 dark:text-white text-sm font-medium outline-none focus:ring-2 transition-all`}
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.name}</p>}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full h-12 pl-10 pr-4 rounded-xl border ${errors.email ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-white/[0.08] focus:border-orange-500 focus:ring-orange-500/20'} bg-zinc-50 dark:bg-[#0F0F12] text-zinc-900 dark:text-white text-sm font-medium outline-none focus:ring-2 transition-all`}
                    placeholder="john@example.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.email}</p>}
              </div>

              {/* Mobile Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Mobile Number
                  </label>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${phone.length === 10 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                    {phone.length} / 10
                  </span>
                </div>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    className={`w-full h-12 pl-10 pr-4 rounded-xl border ${errors.phone ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-white/[0.08] focus:border-orange-500 focus:ring-orange-500/20'} bg-zinc-50 dark:bg-[#0F0F12] text-zinc-900 dark:text-white text-sm font-medium outline-none focus:ring-2 transition-all`}
                    placeholder="9876543210"
                  />
                </div>
                {errors.phone && <p className="mt-1.5 text-xs text-rose-500 font-semibold">{errors.phone}</p>}
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 sm:px-8 py-4 border-t border-zinc-100 dark:border-white/[0.08]">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="h-11 px-5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !isFormValid}
                className="h-11 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditProfileModal;
