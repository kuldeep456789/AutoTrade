import { motion } from 'framer-motion';

const VastraLogo = () => {
  return (
    <motion.div
      className="flex items-center gap-4 cursor-pointer select-none"
      whileHover={{ y: -3, scale: 1.04 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Folded Fabric V Icon */}
      <motion.svg
        width="48"
        height="48"
        viewBox="0 0 38 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial="hidden"
        animate="visible"
      >
        {/* Left fabric fold (top layer - darker) */}
        <motion.path
          d="M4 6 L16 30 L19 34 L10 6 Z"
          fill="#1a1a1a"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Left fabric fold (bottom layer - lighter, creates fold illusion) */}
        <motion.path
          d="M10 6 L19 34 L22 30 L14 6 Z"
          fill="#2a2a2a"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        />
        {/* Right fabric fold (top layer) */}
        <motion.path
          d="M34 6 L22 30 L19 34 L28 6 Z"
          fill="#1a1a1a"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
        />
        {/* Right fabric fold (bottom layer) */}
        <motion.path
          d="M28 6 L19 34 L16 30 L24 6 Z"
          fill="#2a2a2a"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
        />
        {/* Gold accent fold line - left */}
        <motion.line
          x1="10" y1="6" x2="19" y2="34"
          stroke="#C9A227"
          strokeWidth="0.7"
          strokeOpacity="0.6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.5 }}
        />
        {/* Gold accent fold line - right */}
        <motion.line
          x1="28" y1="6" x2="19" y2="34"
          stroke="#C9A227"
          strokeWidth="0.7"
          strokeOpacity="0.6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.6 }}
        />
        {/* Hover shine overlay */}
        <motion.circle
          cx="19" cy="19" r="19"
          fill="url(#goldShine)"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 0.12 }}
          transition={{ duration: 0.3 }}
        />
        <defs>
          <radialGradient id="goldShine" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C9A227" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
          </radialGradient>
        </defs>
      </motion.svg>

      {/* VASTRA Text */}
      <motion.span
        className="hidden sm:block text-[28px] font-black tracking-tighter"
        style={{ fontFamily: "'Outfit', 'Space Grotesk', sans-serif" }}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.7, ease: 'easeOut' }}
      >
        VASTRA
      </motion.span>
    </motion.div>
  );
};

export default VastraLogo;
