import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import type { RootState } from '../../store/store';

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const FacebookIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const YoutubeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z"/>
  </svg>
);

const PinterestIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
  </svg>
);

const Footer = () => {
  const [email, setEmail] = useState('');
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  const trackOrderLink = userInfo ? '/account' : '/login?redirect=/account';
  const returnsLink = userInfo ? '/returns' : '/login?redirect=/returns';
  const supportLink = userInfo ? '/contact' : '/login?redirect=/contact';

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    toast.success('Thank you for subscribing to AutoTrade newsletter!');
    setEmail('');
  };

  return (
    <footer className="bg-zinc-950 text-white font-sans w-full border-t border-zinc-800/80">
      {/* Full-Width Footer Layout (5 Columns across maximum screen width) */}
      <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-10 lg:px-16 py-10 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-12">

          {/* Column 1: Brand Info & Socials */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <img
                src="/img/logo.png"
                alt="AutoTrade"
                className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <div>
                <span className="block text-xl font-extrabold tracking-tight text-white leading-none">AutoTrade</span>
                <span className="block text-[10px] tracking-[0.2em] text-orange-500 font-bold uppercase mt-1">AUTOMOTIVE ESSENTIALS</span>
              </div>
            </Link>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal">
              AutoTrade (autotrade.in) is your premier destination for luxury automotive accessories, diagnostic tools, replacement parts, and maintenance electronics.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-2.5 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all duration-200 shadow-sm border border-orange-500/20"
              >
                <InstagramIcon size={16} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all duration-200 shadow-sm border border-orange-500/20"
              >
                <FacebookIcon size={16} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all duration-200 shadow-sm border border-orange-500/20"
              >
                <YoutubeIcon size={16} />
              </a>
              <a
                href="https://pinterest.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Pinterest"
                className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all duration-200 shadow-sm border border-orange-500/20"
              >
                <PinterestIcon size={15} />
              </a>
            </div>
          </div>

          {/* Column 2: SHOP CATEGORIES */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-extrabold tracking-[0.18em] text-zinc-300 uppercase">SHOP CATEGORIES</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link to="/collections/exterior-accessories" className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                  Exterior Accessories
                </Link>
              </li>
              <li>
                <Link to="/collections/interior-accessories" className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                  Interior Accessories
                </Link>
              </li>
              <li>
                <Link to="/collections/tools-maintenance-care" className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                  Tools & Maintenance
                </Link>
              </li>
              <li>
                <Link to="/collections/car-electronics" className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                  Car Electronics
                </Link>
              </li>
              <li>
                <Link to="/collections/motorcycle-accessories" className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                  Motorcycle Accessories
                </Link>
              </li>
              <li>
                <Link to="/collections/auto-replacement-parts" className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                  Auto Replacement Parts
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: HELP & SUPPORT */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-extrabold tracking-[0.18em] text-zinc-300 uppercase">HELP & SUPPORT</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link to={trackOrderLink} className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to={returnsLink} className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link to={supportLink} className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                  Support Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: CONTACT US */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-extrabold tracking-[0.18em] text-zinc-300 uppercase">CONTACT US</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="mailto:support@autotrade.in" className="flex items-center gap-2.5 text-zinc-400 hover:text-white transition-colors py-0.5 break-all">
                  <Mail size={15} className="shrink-0 text-zinc-400" />
                  <span className="truncate">support@autotrade.in</span>
                </a>
              </li>
              <li>
                <a href="tel:+918255555577" className="flex items-center gap-2.5 text-zinc-400 hover:text-white transition-colors py-0.5">
                  <Phone size={15} className="shrink-0 text-zinc-400" />
                  <span>+91 8255555577</span>
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-zinc-400 py-0.5">
                <MapPin size={15} className="shrink-0 text-zinc-400" />
                <span>Bangalore, KA, India</span>
              </li>
            </ul>
          </div>

          {/* Column 5: NEWSLETTER */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-extrabold tracking-[0.18em] text-zinc-300 uppercase">NEWSLETTER</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal">
              Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
            </p>
            <form onSubmit={handleSubscribe} className="pt-1.5 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-lg px-3.5 h-10 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-4 h-10 rounded-lg transition-colors shrink-0 cursor-pointer shadow-sm"
                >
                  Subscribe
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>

      {/* Bottom Bar (Full-Width) */}
      <div className="border-t border-zinc-800/80 bg-zinc-950 py-5">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-xs text-zinc-400 font-medium">
            © {new Date().getFullYear()} AutoTrade (autotrade.in). All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {['VISA', 'Mastercard', 'RuPay', 'UPI', 'Paytm'].map((method) => (
              <span
                key={method}
                className="px-3 py-1 rounded-lg border border-orange-500/10 bg-orange-950/20 text-[10px] font-bold text-zinc-300 tracking-wider hover:border-orange-500/30 transition-colors"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
