import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X, Eye, EyeOff, Loader2, Lock, KeyRound, ShieldCheck } from 'lucide-react';
import { useChangePasswordMutation } from '../../store/slices/userApiSlice';
import { logout } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PasswordField = ({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  error,
  placeholder,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  error?: string;
  placeholder: string;
  icon: typeof Lock;
}) => {
  const inputId = label.replace(/\s+/g, '');
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 cursor-pointer">{label}</label>
      <div className="relative">
        <Icon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
        <input
          id={inputId}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-[48px] pl-10 pr-12 rounded-xl border ${error ? 'border-red-400 dark:border-red-500' : 'border-zinc-200 dark:border-[#2A2A2A]'} bg-zinc-50 dark:bg-[#0F0F10] text-zinc-900 dark:text-white text-[15px] outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all`}
          placeholder={placeholder}
        />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
      </button>
    </div>
    {error && <p className="mt-1 text-[13px] text-red-500">{error}</p>}
  </div>
  );
};

const ChangePasswordModal = ({ isOpen, onClose }: ChangePasswordModalProps) => {
  const dispatch = useDispatch();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) newErrors.currentPassword = 'Current password is required';

    if (!newPassword) newErrors.newPassword = 'New password is required';
    else if (newPassword.length < 8) newErrors.newPassword = 'Password must be at least 8 characters';
    else if (!/(?=.*[a-z])/.test(newPassword)) newErrors.newPassword = 'Password must contain at least one lowercase letter';
    else if (!/(?=.*[A-Z])/.test(newPassword)) newErrors.newPassword = 'Password must contain at least one uppercase letter';
    else if (!/(?=.*\d)/.test(newPassword)) newErrors.newPassword = 'Password must contain at least one number';
    else if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(newPassword))
      newErrors.newPassword = 'Password must contain at least one special character';

    if (!confirmNewPassword) newErrors.confirmNewPassword = 'Please confirm your new password';
    else if (newPassword !== confirmNewPassword) newErrors.confirmNewPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await changePassword({ currentPassword, newPassword, confirmNewPassword }).unwrap();
      toast.success('Password changed successfully.');
      onClose();
      dispatch(logout());
    } catch (err: any) {
      toast.error(err?.data?.message || 'Unable to update password. Please try again.');
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Change Password</h2>
          <button onClick={handleClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <PasswordField
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggleShow={() => setShowCurrent(!showCurrent)}
            error={errors.currentPassword}
            placeholder="Enter current password"
            icon={Lock}
          />

          <PasswordField
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggleShow={() => setShowNew(!showNew)}
            error={errors.newPassword}
            placeholder="Enter new password"
            icon={KeyRound}
          />

          <PasswordField
            label="Confirm New Password"
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
            show={showConfirm}
            onToggleShow={() => setShowConfirm(!showConfirm)}
            error={errors.confirmNewPassword}
            placeholder="Confirm new password"
            icon={ShieldCheck}
          />

          {/* Password requirements hint */}
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 p-4">
            <p className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 mb-2">Password requirements:</p>
            <ul className="space-y-1 text-[12px] text-zinc-400 dark:text-zinc-500">
              <li className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                At least 8 characters
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${/(?=.*[a-z])/.test(newPassword) ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                One lowercase letter
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${/(?=.*[A-Z])/.test(newPassword) ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                One uppercase letter
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${/(?=.*\d)/.test(newPassword) ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                One number
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(newPassword) ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                One special character
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-[#2A2A2A]">
          <button
            onClick={handleClose}
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
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
