import "./Loader.css";

interface LoaderProps {
  fullScreen?: boolean;
}

export default function Loader({ fullScreen = true }: LoaderProps) {
  return (
    <div className={fullScreen ? "autotrade-loader-overlay" : "autotrade-loader-inline"}>
      <svg
        width="90"
        height="90"
        viewBox="0 0 100 100"
        className="autotrade-loader-svg"
      >
        <defs>
          <clipPath id="autotrade-vclip">
            <polygon points="10,15 50,85 90,15 78,15 50,63 22,15" />
          </clipPath>
          <linearGradient id="autotrade-sweepgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#800000" />
            <stop offset="45%" stopColor="#ee1010" />
            <stop offset="55%" stopColor="#ff6060" />
            <stop offset="65%" stopColor="#ee1010" />
            <stop offset="100%" stopColor="#800000" />
          </linearGradient>
        </defs>
        <polygon
          points="10,15 50,85 90,15 78,15 50,63 22,15"
          fill="#1C274C"
        />
        <g clipPath="url(#autotrade-vclip)">
          <rect
            x="0"
            y="0"
            width="100"
            height="60"
            fill="url(#autotrade-sweepgrad)"
            className="autotrade-sweep-rect"
          />
        </g>
      </svg>
    </div>
  );
}
