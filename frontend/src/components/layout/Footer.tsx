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
    <footer className="bg-zinc-950 text-white font-sans w-full border-t border-zinc-800">
      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12">
          
          {/* Brand Column */}
          <div className="space-y-4 sm:space-y-5">
            <Link to="/" className="inline-block">
              <span className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase font-sans">NAREDI.IN</span>
              <span className="block text-[10px] tracking-[0.2em] text-zinc-400 font-bold uppercase mt-1">AUTOMOTIVE TOOLS</span>
            </Link>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-sm">
              Your premier destination for professional automotive diagnostic equipment, battery chargers, jump starters, and additives.
            </p>
          </div>

          {/* Mobile Side-by-Side Grid for Shop & Help */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 grid grid-cols-2 gap-8 sm:gap-10">
            {/* Shop Navigation */}
            <div className="space-y-4 sm:space-y-5">
              <h4 className="text-xs sm:text-sm font-bold tracking-[0.2em] text-zinc-300 uppercase">Shop Categories</h4>
              <ul className="space-y-2 text-sm font-medium">
                <li>
                  <Link to="/collections/battery-chargers" className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                    Battery Chargers
                  </Link>
                </li>
                <li>
                  <Link to="/collections/battery-testers" className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                    Battery Testers
                  </Link>
                </li>
                <li>
                  <Link to="/collections/performance-additives" className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                    Performance Additives
                  </Link>
                </li>
                <li>
                  <Link to="/collections/jump-starters" className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                    Jump Starters
                  </Link>
                </li>
                <li>
                  <Link to="/collections/obd-tools" className="text-zinc-400 hover:text-white transition-colors duration-200 block py-0.5">
                    OBD Tools
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support & Help */}
            <div className="space-y-4 sm:space-y-5">
              <h4 className="text-xs sm:text-sm font-bold tracking-[0.2em] text-zinc-300 uppercase">Help</h4>
              <ul className="space-y-3 text-sm sm:text-base font-medium">
                <li>
                  <Link to={trackOrderLink} className="text-zinc-400 hover:text-white transition-colors duration-200 block py-1">
                    Track Order
                  </Link>
                </li>
                <li>
                  <Link to={returnsLink} className="text-zinc-400 hover:text-white transition-colors duration-200 block py-1">
                    Returns
                  </Link>
                </li>
                <li>
                  <Link to={supportLink} className="text-zinc-400 hover:text-white transition-colors duration-200 block py-1">
                    Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 sm:space-y-5">
            <h4 className="text-xs sm:text-sm font-bold tracking-[0.2em] text-zinc-300 uppercase">Contact Us</h4>
            <ul className="space-y-3.5 text-sm sm:text-base">
              <li>
                <a href="mailto:vastra3456@gmail.com" className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors py-0.5 break-all">
                  <Mail size={18} className="shrink-0 text-zinc-400" />
                  <span className="truncate">vastra3456@gmail.com</span>
                </a>
              </li>
              <li>
                <a href="tel:+918255555577" className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors py-0.5">
                  <Phone size={18} className="shrink-0 text-zinc-400" />
                  <span>+91 8255555577</span>
                </a>
              </li>
              <li className="flex items-center gap-3 text-zinc-400 py-0.5">
                <MapPin size={18} className="shrink-0 text-zinc-400" />
                <span>Bangalore, Karnataka, India</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
