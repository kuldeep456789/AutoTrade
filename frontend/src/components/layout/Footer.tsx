import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

const Footer = () => {
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  const trackOrderLink = userInfo ? '/account' : '/login?redirect=/account';
  const returnsLink = userInfo ? '/returns' : '/login?redirect=/returns';
  const supportLink = userInfo ? '/contact' : '/login?redirect=/contact';

  return (
    <footer className="bg-zinc-950 text-white font-sans w-full border-t border-zinc-800/80">
      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-8 lg:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10 lg:gap-12">

          {/* Brand Column */}
          <div className="space-y-2 sm:space-y-4">
            <Link to="/" className="inline-block">
              <span className="block text-[10px] tracking-[0.2em] text-red-500 font-bold uppercase">AUTOTRADE AUTOMOTIVE</span>
            </Link>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm font-normal">
              Your premier destination for professional automotive diagnostic equipment, chargers, jump starters, and accessories.
            </p>
          </div>

          {/* Mobile Side-by-Side Grid for Shop & Help */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 grid grid-cols-2 gap-4 sm:gap-8">
            {/* Shop Navigation */}
            <div className="space-y-2 sm:space-y-4">
              <h4 className="text-[11px] sm:text-xs font-bold tracking-[0.18em] text-zinc-300 uppercase">Shop Categories</h4>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm font-medium">
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

            {/* Support & Help */}
            <div className="space-y-2 sm:space-y-4">
              <h4 className="text-[11px] sm:text-xs font-bold tracking-[0.18em] text-zinc-300 uppercase">Help & Support</h4>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm font-medium">
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
          </div>

          {/* Contact Info */}
          <div className="space-y-2 sm:space-y-4">
            <h4 className="text-[11px] sm:text-xs font-bold tracking-[0.18em] text-zinc-300 uppercase">Contact Us</h4>
            <ul className="space-y-1.5 sm:space-y-2.5 text-xs sm:text-sm">
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

        </div>
      </div>
    </footer>
  );
};

export default Footer;
