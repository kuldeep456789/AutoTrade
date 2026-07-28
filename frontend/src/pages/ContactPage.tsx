import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { ChevronRight, Mail, MapPin, Phone, Send, Check, User, Tag, PenLine, Clock, Sparkles, HelpCircle, ChevronDown, Copy, CheckCircle2, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ContactPage = () => {
  const { userInfo } = useSelector((state: RootState) => state.auth);

  if (!userInfo) {
    return <Navigate to="/login?redirect=/contact" replace />;
  }
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    if (userInfo) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || userInfo.name || `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim(),
        email: prev.email || userInfo.email || ''
      }));
    }
  }, [userInfo]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@vastra.in');
    setCopiedEmail(true);
    toast.success('Email copied to clipboard!');
    setTimeout(() => setCopiedEmail(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (!res.ok) throw new Error('Failed to send message');
      
      setSent(true);
      setForm({
        name: userInfo?.name || '',
        email: userInfo?.email || '',
        subject: '',
        message: ''
      });
      setTimeout(() => setSent(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-50 dark:bg-[#0F0F10] min-h-screen text-zinc-900 dark:text-white transition-colors duration-200">
      {/* Breadcrumbs */}
      <div className="w-full border-b border-zinc-200 dark:border-zinc-800/80 px-6 sm:px-10 py-4 bg-white dark:bg-[#141416]">
        <div className="max-w-[1400px] mx-auto flex items-center text-xs font-semibold tracking-wider text-zinc-500">
          <Link to="/" className="hover:text-zinc-900 dark:hover:text-white transition-colors">HOME</Link>
          <ChevronRight size={12} strokeWidth={2} className="mx-2" />
          <span className="text-zinc-900 dark:text-white font-bold">CONTACT US</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-10 sm:py-16">
        <div className="flex flex-col lg:flex-row gap-8 sm:gap-12 items-start">
          
          {/* ── Left Column: Contact Cards ── */}
          <div className="w-full lg:w-[42%] space-y-6">
            <div className="bg-white dark:bg-[#141416] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white uppercase flex items-center gap-2">
                <MessageCircle size={20} className="text-amber-500" /> Contact Information
              </h2>

              <div className="space-y-5 divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {/* Email */}
                <div className="flex items-start gap-4 pt-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Mail size={22} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase">EMAIL ADDRESS</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a href="mailto:support@vastra.in" className="text-base font-semibold text-zinc-900 dark:text-white hover:text-amber-600 transition-colors">
                        support@vastra.in
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        title="Copy Email"
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      >
                        {copiedEmail ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Guaranteed reply within 24 hours</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4 pt-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Phone size={22} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase">PHONE SUPPORT</p>
                    <a href="tel:+918123456789" className="text-base font-semibold text-zinc-900 dark:text-white hover:text-amber-600 transition-colors block mt-0.5">
                      +91 81234 56789
                    </a>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Mon – Sat, 9:00 AM to 8:00 PM IST</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4 pt-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <MapPin size={22} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase">HEADQUARTERS</p>
                    <p className="text-base font-semibold text-zinc-900 dark:text-white mt-0.5">VASTRA HQ</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      HSR Layout, Bangalore - 560102<br />Karnataka, India
                    </p>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="flex items-start gap-4 pt-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Clock size={22} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase">WORKING HOURS</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white mt-0.5">
                      Mon – Sat: 9:00 AM – 8:00 PM
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Message Form ── */}
          <div className="w-full lg:w-[58%] bg-white dark:bg-[#141416] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-10 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white uppercase flex items-center gap-2">
                <Send size={20} className="text-amber-500" /> Send Us a Message
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Fill out the form below and our team will get back to you promptly.
              </p>
            </div>

            {sent ? (
              <div className="border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-8 text-center rounded-2xl space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                  <Check size={28} strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">MESSAGE SENT SUCCESSFULLY!</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
                  Thank you for reaching out. We have received your query and will reply within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Your Name *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={1.5} />
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full pl-11 pr-4 py-3.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-white/10 placeholder:text-zinc-400 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Your Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={1.5} />
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full pl-11 pr-4 py-3.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-white/10 placeholder:text-zinc-400 transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Subject *</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={1.5} />
                    <input
                      type="text"
                      placeholder="e.g. Order Inquiry / Custom Sizing"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-white/10 placeholder:text-zinc-400 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Message *</label>
                  <div className="relative">
                    <PenLine className="absolute left-4 top-4 text-zinc-400" size={18} strokeWidth={1.5} />
                    <textarea
                      placeholder="How can we assist you today?"
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-white/10 placeholder:text-zinc-400 transition-all resize-none"
                      required
                    ></textarea>
                  </div>
                </div>

                {error && (
                  <div className="text-red-600 text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 rounded-xl text-center">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[52px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 dark:border-zinc-900/20 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                      SENDING MESSAGE...
                    </>
                  ) : (
                    <>
                      <Send size={16} strokeWidth={2} />
                      SEND MESSAGE
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ContactPage;
