import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const YoutubeIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z" />
  </svg>
);

const PinterestIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
  </svg>
);

const Footer = () => {
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  const trackOrderLink = userInfo ? '/account' : '/login?redirect=/account';
  const returnsLink = userInfo ? '/returns' : '/login?redirect=/returns';
  const supportLink = userInfo ? '/contact' : '/login?redirect=/contact';

  return (
    <footer style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)' }} className="text-white font-sans w-full border-t border-zinc-800/60">


      {/* ── Main Footer Grid ── */}
      <div className="w-full max-w-[1920px] mx-auto px-8 sm:px-14 lg:px-20 xl:px-28 py-16 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 xl:gap-20">

          {/* Column 1: Brand */}
          <div className="space-y-6">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <img
                src="/img/logo.png"
                alt="AutoTrade"
                className="h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <div>
                <span className="block text-[22px] font-extrabold tracking-tight text-white leading-none">AutoTrade</span>
                <span className="block text-[9px] tracking-[0.25em] text-orange-500 font-bold uppercase mt-1.5">AUTOMOTIVE ESSENTIALS</span>
              </div>
            </Link>

            <p className="text-sm text-zinc-400 leading-7 font-normal">
              Your premier destination for luxury automotive accessories, diagnostic tools replacement parts, and maintenance electronics — trusted by thousands of car enthusiasts across India.
            </p>

            {/* Social Icons */}
            <div>
              <p className="text-[10px] tracking-[0.18em] text-zinc-500 uppercase font-bold mb-3">Follow Us</p>
              <div className="flex items-center gap-3">
                {[
                  { href: 'https://instagram.com', label: 'Instagram', icon: <InstagramIcon size={17} /> },
                  { href: 'https://facebook.com', label: 'Facebook', icon: <FacebookIcon size={17} /> },
                  { href: 'https://youtube.com', label: 'YouTube', icon: <YoutubeIcon size={17} /> },
                  { href: 'https://pinterest.com', label: 'Pinterest', icon: <PinterestIcon size={16} /> },
                ].map(({ href, label, icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="w-9 h-9 rounded-full bg-zinc-800/80 text-zinc-400 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all duration-200 border border-zinc-700/50 hover:border-orange-500"
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Shop Categories */}
          <div className="space-y-5">
            <div>
              <h4 className="text-[10px] font-extrabold tracking-[0.2em] text-orange-500 uppercase mb-1">Shop</h4>
              <h3 className="text-sm font-bold text-white tracking-wide">Categories</h3>
              <div className="w-8 h-0.5 bg-orange-500/60 mt-2 rounded-full" />
            </div>
            <ul className="space-y-0.5">
              {[
                { to: '/collections/exterior-accessories', label: 'Exterior Accessories' },
                { to: '/collections/interior-accessories', label: 'Interior Accessories' },
                { to: '/collections/tools-maintenance-care', label: 'Tools, Maintenance & Care' },
                { to: '/collections/car-electronics', label: 'Car Electronics' },
                { to: '/collections/motorcycle-accessories', label: 'Motorcycle Accessories' },
                { to: '/collections/auto-replacement-parts', label: 'Auto Replacement Parts' },
              ].map(({ to, label }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="group flex items-center gap-2.5 text-sm text-zinc-400 hover:text-white transition-colors duration-200 py-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-orange-500 transition-colors duration-200 shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Help & Support */}
          <div className="space-y-5">
            <div>
              <h4 className="text-[10px] font-extrabold tracking-[0.2em] text-orange-500 uppercase mb-1">Customer</h4>
              <h3 className="text-sm font-bold text-white tracking-wide">Help &amp; Support</h3>
              <div className="w-8 h-0.5 bg-orange-500/60 mt-2 rounded-full" />
            </div>
            <ul className="space-y-0.5">
              {[
                // { to: trackOrderLink, label: 'Track Order' },
                { to: returnsLink, label: 'Returns & Refunds' },
                // { to: supportLink, label: 'Support Center' },
                // { to: '/faq', label: 'FAQs' },
                // { to: '/shipping-policy', label: 'Shipping Policy' },
                // { to: '/privacy-policy', label: 'Privacy Policy' },
              ].map(({ to, label }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="group flex items-center gap-2.5 text-sm text-zinc-400 hover:text-white transition-colors duration-200 py-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-orange-500 transition-colors duration-200 shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact Us */}
          <div className="space-y-5">
            <div>
              <h4 className="text-[10px] font-extrabold tracking-[0.2em] text-orange-500 uppercase mb-1">Get In Touch</h4>
              <h3 className="text-sm font-bold text-white tracking-wide">Contact Us</h3>
              <div className="w-8 h-0.5 bg-orange-500/60 mt-2 rounded-full" />
            </div>
            <ul className="space-y-4">
              <li>
                <a
                  href="mailto:support@autotrade.in"
                  className="flex items-start gap-3.5 text-sm text-zinc-400 hover:text-white transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0 group-hover:border-orange-500/40 group-hover:bg-orange-500/10 transition-all duration-200">
                    <Mail size={15} className="text-zinc-400 group-hover:text-orange-400 transition-colors" />
                  </span>
                  <span className="pt-1">
                    <span className="block text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-0.5">Email</span>
                    support@autotrade.in
                  </span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+918255555577"
                  className="flex items-start gap-3.5 text-sm text-zinc-400 hover:text-white transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0 group-hover:border-orange-500/40 group-hover:bg-orange-500/10 transition-all duration-200">
                    <Phone size={15} className="text-zinc-400 group-hover:text-orange-400 transition-colors" />
                  </span>
                  <span className="pt-1">
                    <span className="block text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-0.5">Phone</span>
                    +91 8255 555 577
                  </span>
                </a>
              </li>
              <li className="group flex items-start gap-3.5 text-sm text-zinc-400 hover:text-white transition-colors">
                <span className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0 group-hover:border-orange-500/40 group-hover:bg-orange-500/10 transition-all duration-200">
                  <MapPin size={15} className="text-zinc-400 group-hover:text-orange-400 transition-colors" />
                </span>
                <span className="pt-1">
                  <span className="block text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-0.5">Address</span>
                  Banglore, Karnataka, India
                </span>
              </li>
            </ul>

          </div>


        </div>
      </div>

      {/* ── Divider ── */}
      <div className="w-full max-w-[1920px] mx-auto px-8 sm:px-14 lg:px-20 xl:px-28">
        <div className="border-t border-zinc-800/60" />
      </div>



    </footer>
  );
};

export default Footer;


