import React from 'react';
import { X, AlertCircle, ShoppingBag } from 'lucide-react';
import { formatINR } from '../../lib/currency';
import { motion, AnimatePresence } from 'framer-motion';

interface MinimumOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartTotal: number;
}

const MinimumOrderModal: React.FC<MinimumOrderModalProps> = ({ isOpen, onClose, cartTotal }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex justify-between items-center p-5 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
              <AlertCircle className="text-amber-500 h-5 w-5" />
              Minimum Order Value Required
            </h3>
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          
          <div className="p-6">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 mb-6">
              <p className="text-amber-800 dark:text-amber-200 text-[15px] leading-relaxed">
                The minimum order value is <span className="font-bold">₹50,000</span>. 
                Your current cart total is <span className="font-bold">{formatINR(cartTotal)}</span>. 
                Please add more items to continue.
              </p>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={onClose}
                className="w-full h-12 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag size={18} strokeWidth={2} />
                Continue Shopping
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MinimumOrderModal;
