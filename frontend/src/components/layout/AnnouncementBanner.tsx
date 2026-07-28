const AnnouncementBanner = () => {
  return (
    <div
      className="bg-[#101B36] text-zinc-300 text-[14px] sm:text-[15px] py-2 overflow-hidden w-full flex items-center border-b border-[#1C274C] z-40"
      style={{ marginTop: '72px' }}
    >
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          .animate-marquee {
            display: inline-flex;
            white-space: nowrap;
            animation: marquee 25s linear infinite;
            min-width: 100%;
          }
        `}
      </style>
      <div className="w-full overflow-hidden">
        <div className="animate-marquee font-medium items-center justify-center text-zinc-300">
          <span className="mr-3">⚡ Welcome to AutoTrade — Premium Automotive Accessories & Parts • Get 10% OFF with code <strong className="text-red-400 font-bold">AUTOTRADE10</strong> • Free Shipping on Orders Above ₹3,000 ⚡</span>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
