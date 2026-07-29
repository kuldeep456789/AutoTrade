interface LoaderProps {
  fullScreen?: boolean;
}

export default function Loader({ fullScreen = true }: LoaderProps) {
  return (
    <div
      className={
        fullScreen
          ? "fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
          : "flex flex-col items-center justify-center p-10"
      }
    >
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Premium Tailwind animated spinning ring */}
        <div className="absolute inset-0 border-3 border-zinc-800 border-t-orange-500 rounded-full animate-spin" />

        {/* Brand logo image inside the spinning ring */}
        <img
          src="/img/logo.png"
          alt="AutoTrade Loading..."
          className="w-[70px] h-[70px] object-contain rounded-full bg-black p-2 filter drop-shadow-[0_0_12px_rgba(249,115,22,0.3)] animate-pulse"
        />
      </div>
      <p className="mt-5 text-[11px] font-bold tracking-[0.25em] text-zinc-500 uppercase animate-pulse">
        Loading AutoTrade...
      </p>
    </div>
  );
}
