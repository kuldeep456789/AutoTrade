import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { X, Loader2, User, Mail, Phone, Calendar, Users2, Image, Camera, Trash2 } from 'lucide-react';
import { useUpdateProfileMutation } from '../../store/slices/userApiSlice';
import { setCredentials } from '../../store/slices/authSlice';
import type { UserInfo } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

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
  const [gender, setGender] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && user) {
      setName(user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : user.name || '');
      setEmail(user.email);
      setPhone(user.phone || '');
      setGender(user.gender || '');
      setAvatar(user.avatar || (user as any).image || user.profileImage || null);
      setErrors({});
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email address';

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
        gender: gender || undefined,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Edit Profile</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Avatar / Profile Picture Upload */}
          <div className="flex flex-col items-center justify-center pb-2">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()} title="Click to change profile photo">
              <div className="w-24 h-24 rounded-full border-4 border-zinc-200 dark:border-[#2A2A2A] bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-3xl shadow-inner">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (name[0] || user?.email?.[0] || 'U').toUpperCase()
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera size={24} />
              </div>
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-[#18181B]">
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
            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-zinc-900 dark:text-white hover:underline cursor-pointer"
              >
                {avatar ? 'Change Photo' : 'Upload Photo'}
              </button>
              {avatar && (
                <>
                  <span className="text-zinc-400 text-xs">•</span>
                  <button
                    type="button"
                    onClick={() => setAvatar(null)}
                    className="text-xs font-semibold text-red-500 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full h-[48px] pl-10 pr-4 rounded-xl border ${errors.name ? 'border-red-400 dark:border-red-500' : 'border-zinc-200 dark:border-[#2A2A2A]'} bg-zinc-50 dark:bg-[#0F0F10] text-zinc-900 dark:text-white text-[15px] outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all`}
                placeholder="John Doe"
              />
            </div>
            {errors.name && <p className="mt-1 text-[13px] text-red-500">{errors.name}</p>}
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full h-[48px] pl-10 pr-4 rounded-xl border ${errors.email ? 'border-red-400 dark:border-red-500' : 'border-zinc-200 dark:border-[#2A2A2A]'} bg-zinc-50 dark:bg-[#0F0F10] text-zinc-900 dark:text-white text-[15px] outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all`}
                placeholder="john@example.com"
              />
            </div>
            {errors.email && <p className="mt-1 text-[13px] text-red-500">{errors.email}</p>}
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Mobile Number</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-[48px] pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-[#2A2A2A] bg-zinc-50 dark:bg-[#0F0F10] text-zinc-900 dark:text-white text-[15px] outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all"
                placeholder="+91 9876543210"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Gender (optional)</label>
            <div className="relative">
              <Users2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-[48px] pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-[#2A2A2A] bg-zinc-50 dark:bg-[#0F0F10] text-zinc-900 dark:text-white text-[15px] outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all appearance-none"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-[#2A2A2A]">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="h-[48px] px-6 rounded-xl border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-[15px] font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="h-[48px] px-6 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 active:scale-[0.98] shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
