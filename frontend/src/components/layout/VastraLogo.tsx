import { motion } from 'framer-motion';

const VastraLogo = () => {
  return (
    <motion.div
      className="flex items-center cursor-pointer select-none"
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 300 105"
        className="w-[160px] sm:w-[195px] h-auto"
        aria-label="AutoTrade - Drive Business Forward"
      >
        <defs>
          {/* ─── SHINY CHROME Silver for "A" ─── */}
          <linearGradient id="chromeA" x1="0%" y1="0%" x2="10%" y2="100%">
            <stop offset="0%"  stopColor="#ffffff" />
            <stop offset="18%" stopColor="#e0e0e0" />
            <stop offset="35%" stopColor="#b8b8b8" />
            <stop offset="55%" stopColor="#f5f5f5" />
            <stop offset="75%" stopColor="#9a9a9a" />
            <stop offset="100%" stopColor="#d0d0d0" />
          </linearGradient>

          {/* ─── VIVID RED for "T" ─── */}
          <linearGradient id="vividRed" x1="0%" y1="0%" x2="30%" y2="100%">
            <stop offset="0%"  stopColor="#ff6060" />
            <stop offset="30%" stopColor="#ee1010" />
            <stop offset="60%" stopColor="#cc0000" />
            <stop offset="100%" stopColor="#800000" />
          </linearGradient>

          {/* ─── Car silhouette gradient ─── */}
          <linearGradient id="carChrome" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#666666" />
            <stop offset="30%"  stopColor="#cccccc" />
            <stop offset="50%"  stopColor="#ffffff" />
            <stop offset="70%"  stopColor="#dddddd" />
            <stop offset="100%" stopColor="#888888" />
          </linearGradient>

          {/* ─── Speed lines gradient ─── */}
          <linearGradient id="speedLine" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%"   stopColor="#ff1a1a" stopOpacity="1" />
            <stop offset="60%"  stopColor="#cc0000" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#cc0000" stopOpacity="0" />
          </linearGradient>

          {/* ─── "Auto" text silver ─── */}
          <linearGradient id="autoSilver" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#ffffff" />
            <stop offset="40%"  stopColor="#dddddd" />
            <stop offset="100%" stopColor="#aaaaaa" />
          </linearGradient>

          {/* ─── Glow for red elements ─── */}
          <filter id="redGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* ─── Chrome glow for A ─── */}
          <filter id="chromeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* ─── Soft drop shadow ─── */}
          <filter id="deepShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.85" />
          </filter>

          {/* ─── Car glow ─── */}
          <filter id="carGlow" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ════════════════════════════════════
            CAR SILHOUETTE
        ════════════════════════════════════ */}

        {/* Glowing white highlight on top of the roof arc */}
        <motion.path
          d="M 55 40 C 73 20, 103 12, 138 11 C 168 10, 195 16, 215 27 C 232 35, 242 42, 248 47"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        {/* Main chrome arc */}
        <motion.path
          d="M 55 40 C 73 20, 103 12, 138 11 C 168 10, 195 16, 215 27 C 232 35, 242 42, 248 47"
          stroke="url(#carChrome)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          filter="url(#carGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />

        {/* Rear slope */}
        <motion.path
          d="M 55 40 C 59 43, 68 47, 74 49"
          stroke="url(#carChrome)"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.35, ease: 'easeOut' }}
        />

        {/* Front slope */}
        <motion.path
          d="M 248 47 C 252 49, 258 52, 261 54"
          stroke="url(#carChrome)"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.55, ease: 'easeOut' }}
        />

        {/* Front bonnet tip */}
        <motion.path
          d="M 261 54 C 266 56, 271 57, 275 55"
          stroke="url(#carChrome)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.68, ease: 'easeOut' }}
        />

        {/* ════════════════════════════════════
            RED SPEED LINES (left side)
        ════════════════════════════════════ */}
        {[
          { y: 47, x1: 70, x2: 38, w: 2.4 },
          { y: 52, x1: 73, x2: 32, w: 1.9 },
          { y: 57, x1: 77, x2: 26, w: 1.4 },
          { y: 62, x1: 80, x2: 22, w: 1.0 },
        ].map((l, i) => (
          <motion.line
            key={i}
            x1={l.x1} y1={l.y} x2={l.x2} y2={l.y}
            stroke="url(#speedLine)"
            strokeWidth={l.w}
            strokeLinecap="round"
            filter="url(#redGlow)"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.35, delay: 0.72 + i * 0.05, ease: 'easeOut' }}
            style={{ transformOrigin: `${l.x1}px ${l.y}px` }}
          />
        ))}

        {/* ════════════════════════════════════
            "A" — CHROME SILVER (bold italic)
        ════════════════════════════════════ */}
        {/* Black outline / shadow layer */}
        <motion.path
          d="M 88 77 L 114 25 L 140 77 M 97 58 L 131 58"
          stroke="#111111"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.15 }}
        />
        {/* Chrome A */}
        <motion.path
          d="M 88 77 L 114 25 L 140 77 M 97 58 L 131 58"
          stroke="url(#chromeA)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="url(#chromeGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.15 }}
        />

        {/* ════════════════════════════════════
            "T" — VIVID RED (bold italic)
        ════════════════════════════════════ */}
        {/* Black outline / shadow layer */}
        <motion.path
          d="M 148 25 L 202 25 M 175 25 L 175 77"
          stroke="#1a0000"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
        {/* Red T */}
        <motion.path
          d="M 148 25 L 202 25 M 175 25 L 175 77"
          stroke="url(#vividRed)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          filter="url(#redGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />

        {/* ════════════════════════════════════
            "Auto" TEXT — silver
        ════════════════════════════════════ */}
        {/* Shadow */}
        <motion.text
          x="44" y="99"
          fontFamily="'Trebuchet MS', Georgia, serif"
          fontSize="20" fontWeight="900" fontStyle="italic"
          fill="#000000" letterSpacing="0.3"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.62 }}
        >Auto</motion.text>
        {/* Silver text */}
        <motion.text
          x="43" y="98"
          fontFamily="'Trebuchet MS', Georgia, serif"
          fontSize="20" fontWeight="900" fontStyle="italic"
          fill="url(#autoSilver)" letterSpacing="0.3"
          filter="url(#deepShadow)"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.62 }}
        >Auto</motion.text>

        {/* ════════════════════════════════════
            "Trade" TEXT — vivid red
        ════════════════════════════════════ */}
        {/* Shadow */}
        <motion.text
          x="106" y="99"
          fontFamily="'Trebuchet MS', Georgia, serif"
          fontSize="20" fontWeight="900" fontStyle="italic"
          fill="#1a0000" letterSpacing="0.3"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.72 }}
        >Trade</motion.text>
        {/* Red text */}
        <motion.text
          x="105" y="98"
          fontFamily="'Trebuchet MS', Georgia, serif"
          fontSize="20" fontWeight="900" fontStyle="italic"
          fill="url(#vividRed)" letterSpacing="0.3"
          filter="url(#redGlow)"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.72 }}
        >Trade</motion.text>

        {/* ════════════════════════════════════
            TAGLINE
        ════════════════════════════════════ */}
        <motion.line x1="44" y1="105" x2="88" y2="105"
          stroke="#cc0000" strokeWidth="0.9" opacity="0.9"
          filter="url(#redGlow)"
          initial={{ opacity: 0 }} animate={{ opacity: 0.9 }}
          transition={{ duration: 0.3, delay: 0.95 }}
        />
        <motion.line x1="196" y1="105" x2="238" y2="105"
          stroke="#cc0000" strokeWidth="0.9" opacity="0.9"
          filter="url(#redGlow)"
          initial={{ opacity: 0 }} animate={{ opacity: 0.9 }}
          transition={{ duration: 0.3, delay: 0.95 }}
        />
        <motion.text
          x="141" y="106"
          fontFamily="'Arial Narrow', Arial, sans-serif"
          fontSize="6.5" fontWeight="700"
          fill="#cccccc" letterSpacing="2"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.05 }}
        >DRIVE BUSINESS FORWARD</motion.text>
      </svg>
    </motion.div>
  );
};

export default VastraLogo;
