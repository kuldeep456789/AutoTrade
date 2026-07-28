
const AnnouncementBanner = () => {
  return (
    <div
      className="bg-[#f5f5f5] text-black text-[20px] py-2.5 overflow-hidden w-full flex items-center border-b border-gray-200 z-40"
      style={{ marginTop: '88px' }}
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
            animation: marquee 20s linear infinite;
            min-width: 100%;
          }
        `}
      </style>
      <div className="w-full overflow-hidden">
        <div className="animate-marquee font-medium items-center justify-center">
          <span className="mr-3">Welcome to VASTRA B2B Get 10% OFF with code VASTRA10 Minimum Order Value: ₹50,000</span>
          {/* <Link to="/" className="underline hover:text-gray-600 transition-colors mx-2">Download Now</Link>
          <Link to="/" className="underline hover:text-gray-600 transition-colors">T&Cs</Link> */}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
