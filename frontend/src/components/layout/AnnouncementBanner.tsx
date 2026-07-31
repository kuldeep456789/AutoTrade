import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_CATEGORIES as navCategories } from '../../config/categories';

const AnnouncementBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hoveredSub, setHoveredSub] = useState<string | null>(null);
  const dropdownCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNavEnter = (label: string) => {
    clearTimeout(dropdownCloseTimer.current);
    setOpenDropdown(label);
    setHoveredSub(null);
  };

  const handleNavLeave = () => {
    dropdownCloseTimer.current = setTimeout(() => {
      setOpenDropdown(null);
      setHoveredSub(null);
    }, 120);
  };

  const handleDropdownEnter = () => {
    clearTimeout(dropdownCloseTimer.current);
  };

  const handleDropdownLeave = () => {
    dropdownCloseTimer.current = setTimeout(() => {
      setOpenDropdown(null);
      setHoveredSub(null);
    }, 120);
  };

  return (
    <div
      className="bg-black text-zinc-300 text-xs sm:text-[13px] border-b border-zinc-800 z-40 w-full relative"
      style={{ marginTop: '80px' }}
    >
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 h-11 flex items-center justify-between">
        {/* Left Side: Category Mega Dropdowns */}
        <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto lg:overflow-visible scrollbar-hide flex-nowrap shrink-0 max-w-[80%] sm:max-w-none">
          {navCategories.map((cat) => {
            const hasSubs = cat.subs.length > 0;
            const isOpen = openDropdown === cat.label;
            const active = isActive(cat.to);

            return (
              <div
                key={cat.to}
                className="relative"
                onMouseEnter={() => handleNavEnter(cat.label)}
                onMouseLeave={handleNavLeave}
              >
                {/* Category button */}
                <Link
                  to={cat.to}
                  className={`flex items-center gap-1 px-2.5 py-2 rounded-md font-semibold tracking-wide transition-all duration-150 whitespace-nowrap text-[12px] sm:text-[13px] ${active
                      ? 'text-orange-500'
                      : isOpen
                        ? 'text-white bg-white/5'
                        : 'text-zinc-300 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {cat.label}
                  {hasSubs && (
                    <ChevronDown
                      className={`h-3 w-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-400' : 'text-zinc-500'
                        }`}
                      strokeWidth={2.5}
                    />
                  )}
                </Link>

                {/* Mega Dropdown */}
                <AnimatePresence>
                  {isOpen && hasSubs && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scaleY: 0.97 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: -6, scaleY: 0.97 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      style={{ transformOrigin: 'top center' }}
                      className="absolute top-full left-0 mt-0 z-50 flex rounded-xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-950 p-1"
                      onMouseEnter={handleDropdownEnter}
                      onMouseLeave={handleDropdownLeave}
                    >
                      {/* Left panel – category list */}
                      <div className="w-[230px] border-r border-zinc-800/80 py-3 min-h-[340px]">
                        {navCategories.map((c) => {
                          const isHighlighted = c.label === (hoveredSub?.split('__')[0] ?? cat.label);
                          return (
                            <div
                              key={c.label}
                              className={`flex items-center justify-between px-4 py-3 cursor-pointer rounded-lg transition-colors duration-100 group/item ${isHighlighted ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-900/50 text-zinc-400 hover:text-white'
                                }`}
                              onMouseEnter={() => setHoveredSub(c.label + '__')}
                              onClick={() => {
                                setOpenDropdown(null);
                                setHoveredSub(null);
                                navigate(c.to);
                              }}
                            >
                              <span className="text-[12.5px] font-semibold">{c.label}</span>
                              {c.subs.length > 0 && (
                                <ChevronRight
                                  size={13}
                                  className={`transition-colors ${isHighlighted ? 'text-orange-500' : 'text-zinc-500 group-hover/item:text-white'}`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Right panel – subcategory list */}
                      {(() => {
                        const activeCatLabel = hoveredSub ? hoveredSub.split('__')[0] : cat.label;
                        const highlightedCat = navCategories.find((c) => c.label === activeCatLabel);
                        if (!highlightedCat || highlightedCat.subs.length === 0) return null;
                        return (
                          <div className="w-[210px] py-3 bg-zinc-950 min-h-[340px]">
                            {highlightedCat.subs.map((sub) => (
                              <Link
                                key={sub.to}
                                to={sub.to}
                                onClick={() => {
                                  setOpenDropdown(null);
                                  setHoveredSub(null);
                                }}
                                className="block px-4 py-3 rounded-lg text-[12.5px] text-zinc-400 hover:text-orange-500 hover:bg-zinc-900 transition-colors duration-100 font-semibold"
                              >
                                {sub.label}
                              </Link>
                            ))}
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Right Side: Bulk Order Link
        <div className="shrink-0 flex items-center ml-4">
          <Link
            to="/contact?subject=Bulk Order Enquiry"
            className="hover:text-white text-orange-500 transition-colors duration-200 flex items-center gap-1.5 font-bold tracking-wide uppercase text-[11px]"
          >
            <Boxes size={15} className="text-orange-500" />
            <span>Bulk Order</span>
          </Link>
        </div> */}
      </div>
    </div>
  );
};

export default AnnouncementBanner;
